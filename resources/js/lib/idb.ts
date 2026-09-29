/** Minimal promise wrapper around IndexedDB (no dependency). */

function request<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB gagal.'));
    });
}

function openDb(name: string, store: string): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(name, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(store)) {
                db.createObjectStore(store, { keyPath: 'idemKey' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB gagal.'));
    });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
    if (!dbPromise) {
        dbPromise = openDb('nexpos-pos', 'outbox');
    }
    return dbPromise;
}

async function tx<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => Promise<T> | IDBRequest<T>,
): Promise<T> {
    const database = await db();
    const transaction = database.transaction('outbox', mode);
    const store = transaction.objectStore('outbox');
    const result = await run(store);
    return result instanceof IDBRequest ? request(result) : result;
}

export const idb = {
    put<T extends { idemKey: string }>(value: T): Promise<void> {
        return tx('readwrite', (store) =>
            request(store.put(value)).then(() => undefined),
        );
    },
    all<T>(): Promise<T[]> {
        return tx('readonly', (store) => request<T[]>(store.getAll()));
    },
    remove(idemKey: string): Promise<void> {
        return tx('readwrite', (store) =>
            request(store.delete(idemKey)).then(() => undefined),
        );
    },
    clear(): Promise<void> {
        return tx('readwrite', (store) =>
            request(store.clear()).then(() => undefined),
        );
    },
};
