import { useEffect, useState } from 'react';

/** Register /sw.js in production builds only (never in Vite dev/HMR). */
export function registerServiceWorker(): void {
    if (typeof window === 'undefined' || !import.meta.env.PROD) {
        return;
    }
    if (!('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Offline support is best-effort; the POS still works online.
        });
    });
}

/** Ask the service worker to wake tabs for a queue flush. */
export function requestBackgroundSync(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return;
    }
    if (!('SyncManager' in window)) {
        return;
    }

    navigator.serviceWorker.ready
        .then((registration) => {
            const sync = (
                registration as unknown as {
                    sync?: { register(tag: string): Promise<void> };
                }
            ).sync;
            return sync?.register('nexpos-checkout');
        })
        .catch(() => undefined);
}

export function useOnline(): boolean {
    const [online, setOnline] = useState(() =>
        typeof navigator === 'undefined' ? true : navigator.onLine,
    );

    useEffect(() => {
        const goOnline = () => setOnline(true);
        const goOffline = () => setOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    return online;
}

const LIVE_CHANNEL = 'nexpos:pos:live';

let liveChannel: BroadcastChannel | null = null;

/** Instant same-device mirror for the buyer display (storage event stays as fallback). */
export function broadcastLiveSnapshot(): void {
    try {
        if (typeof BroadcastChannel === 'undefined') {
            return;
        }
        liveChannel ??= new BroadcastChannel(LIVE_CHANNEL);
        liveChannel.postMessage({ t: Date.now() });
    } catch {
        // Fallback remains: storage event + 2s polling on the display.
    }
}

export function onLiveSnapshot(callback: () => void): () => void {
    try {
        if (typeof BroadcastChannel === 'undefined') {
            return () => undefined;
        }
        liveChannel ??= new BroadcastChannel(LIVE_CHANNEL);
        const handler = () => callback();
        liveChannel.addEventListener('message', handler);
        return () => liveChannel?.removeEventListener('message', handler);
    } catch {
        return () => undefined;
    }
}
