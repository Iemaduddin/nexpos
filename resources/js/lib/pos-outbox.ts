import { idb } from '@/lib/idb';

/**
 * Offline checkout outbox.
 *
 * Server stays the source of truth: entries carry the exact request body
 * (including a client-generated idempotency key) and are sent verbatim
 * when connectivity returns. Pricing and stock are re-validated by
 * Laravel; conflicts come back as 422 and stay visible for the cashier.
 */

export type CheckoutPayload = {
    customer_id: number | null;
    discount_total: number;
    idempotency_key: string;
    items: {
        product_id: number;
        variant_id: number | null;
        qty: number;
        discount: number;
    }[];
    payments: { method: string; amount: number; reference_no: string | null }[];
};

export type QueuedCheckout = {
    idemKey: string;
    createdAt: number;
    storeId: number;
    storeName: string;
    customerName: string | null;
    itemCount: number;
    grand: number;
    payload: CheckoutPayload;
    status: 'queued' | 'conflict';
    error: string | null;
};

export type SyncOutcome =
    | { kind: 'synced'; sale: unknown }
    | { kind: 'conflict'; messages: string[] }
    | { kind: 'retry' };

export async function enqueueCheckout(
    entry: Omit<QueuedCheckout, 'status' | 'error'>,
): Promise<QueuedCheckout> {
    const queued: QueuedCheckout = { ...entry, status: 'queued', error: null };
    await idb.put(queued);
    return queued;
}

export function listQueued(): Promise<QueuedCheckout[]> {
    return idb
        .all<QueuedCheckout>()
        .then((rows) =>
            rows
                .filter((row) => row && typeof row.idemKey === 'string')
                .sort((a, b) => a.createdAt - b.createdAt),
        );
}

export function markConflict(
    idemKey: string,
    messages: string[],
): Promise<void> {
    return listQueued().then((rows) => {
        const found = rows.find((row) => row.idemKey === idemKey);
        if (!found) {
            return;
        }
        return idb.put({
            ...found,
            status: 'conflict',
            error: messages.join(' '),
        });
    });
}

export function removeQueued(idemKey: string): Promise<void> {
    return idb.remove(idemKey);
}

/**
 * Send every queued entry through `submit`. Stops at the first entry
 * that still needs connectivity so order is preserved (FIFO).
 */
export async function flushOutbox(
    submit: (payload: CheckoutPayload) => Promise<SyncOutcome>,
    onSynced: (entry: QueuedCheckout, sale: unknown) => void,
): Promise<{ synced: number; conflicts: number; pending: number }> {
    let synced = 0;
    let conflicts = 0;

    const rows = await listQueued();

    for (const entry of rows) {
        if (entry.status === 'conflict') {
            conflicts += 1;
            continue;
        }

        const outcome = await submit(entry.payload);

        if (outcome.kind === 'synced') {
            await idb.remove(entry.idemKey);
            synced += 1;
            onSynced(entry, outcome.sale);
        } else if (outcome.kind === 'conflict') {
            await markConflict(entry.idemKey, outcome.messages);
            conflicts += 1;
        } else {
            break;
        }
    }

    const pending = (await listQueued()).filter(
        (row) => row.status === 'queued',
    ).length;

    return { synced, conflicts, pending };
}
