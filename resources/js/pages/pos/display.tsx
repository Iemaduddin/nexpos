import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    BuyerDisplay,
    readLiveSnapshot,
    type PosLiveSnapshot,
} from '@/components/pos/buyer-display';
import { onLiveSnapshot } from '@/lib/pwa';

const STALE_MS = 15000;
const SUCCESS_HOLD_MS = 5000;

export default function PosDisplay({
    store,
}: {
    store: { id: number; name: string };
}) {
    const [snapshot, setSnapshot] = useState<PosLiveSnapshot | null>(() =>
        typeof window === 'undefined' ? null : readLiveSnapshot(),
    );

    useEffect(() => {
        const refresh = () => setSnapshot(readLiveSnapshot());
        refresh();
        // Urutan pembaruan: BroadcastChannel (instan) → storage event → polling.
        const stopLive = onLiveSnapshot(refresh);
        const onStorage = (e: StorageEvent) => {
            if (e.key === null || e.key.endsWith(':pos:live:v1')) {
                refresh();
            }
        };
        window.addEventListener('storage', onStorage);
        const timer = setInterval(refresh, 2000);
        return () => {
            stopLive();
            window.removeEventListener('storage', onStorage);
            clearInterval(timer);
        };
    }, []);

    const receiptNumber = snapshot?.receipt?.number ?? null;
    const [dismissedNumber, setDismissedNumber] = useState<string | null>(null);

    // Setelah sukses tampil 5 detik, kembali ke tampilan default.
    // Struk baru (nomor berbeda) akan ditampilkan lagi.
    useEffect(() => {
        if (!receiptNumber || receiptNumber === dismissedNumber) {
            return;
        }
        const timer = setTimeout(
            () => setDismissedNumber(receiptNumber),
            SUCCESS_HOLD_MS,
        );
        return () => clearTimeout(timer);
    }, [receiptNumber, dismissedNumber]);

    const stale = !snapshot || Date.now() - snapshot.savedAt > STALE_MS;
    const visibleReceipt =
        receiptNumber && receiptNumber !== dismissedNumber
            ? (snapshot?.receipt ?? null)
            : null;

    return (
        <>
            <Head title={`Layar Pembeli · ${store.name}`} />
            <div className="flex min-h-svh flex-col bg-background">
                {stale || !snapshot ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                        <img
                            src="/logo.webp"
                            alt="NEXPOS"
                            className="size-20 rounded-2xl object-cover"
                        />
                        <p className="text-3xl font-semibold">{store.name}</p>
                        <p className="max-w-sm text-muted-foreground">
                            Menunggu kasir… buka halaman ini dari tombol “Layar
                            kedua” di halaman kasir pada perangkat yang sama.
                        </p>
                    </div>
                ) : (
                    <BuyerDisplay
                        storeName={snapshot.storeName}
                        customerName={snapshot.customerName ?? null}
                        lines={snapshot.lines}
                        grand={snapshot.grand}
                        paid={snapshot.paid}
                        payments={snapshot.payments ?? []}
                        receipt={visibleReceipt}
                    />
                )}
            </div>
        </>
    );
}
