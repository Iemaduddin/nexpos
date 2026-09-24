import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

import { useAppearance } from '@/hooks/use-appearance';
import { useFlashToast } from '@/hooks/use-flash-toast';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'info' | 'warning' | 'error' | 'message';

type ToastItem = {
    id: number;
    type: ToastType;
    message: string;
};

type ToastListener = (items: ToastItem[]) => void;

let toastId = 0;
let toastItems: ToastItem[] = [];
const listeners = new Set<ToastListener>();

function emit() {
    for (const listener of listeners) {
        listener([...toastItems]);
    }
}

function pushToast(type: ToastType, message: string) {
    const id = ++toastId;
    toastItems = [...toastItems.slice(-4), { id, type, message }];
    emit();
    setTimeout(() => {
        toastItems = toastItems.filter((t) => t.id !== id);
        emit();
    }, 4000);
    return id;
}

function dismissToast(id?: number) {
    toastItems =
        id === undefined ? [] : toastItems.filter((t) => t.id !== id);
    emit();
}

export const toast = Object.assign(
    (message: string) => pushToast('message', message),
    {
        success: (message: string) => pushToast('success', message),
        info: (message: string) => pushToast('info', message),
        warning: (message: string) => pushToast('warning', message),
        error: (message: string) => pushToast('error', message),
        message: (message: string) => pushToast('message', message),
        dismiss: dismissToast,
    },
);

export type ToasterProps = {
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    className?: string;
};

const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="size-4 text-green-500" />,
    info: <Info className="size-4 text-sky-500" />,
    warning: <TriangleAlert className="size-4 text-amber-500" />,
    error: <AlertCircle className="size-4 text-destructive" />,
    message: <Info className="size-4 text-muted-foreground" />,
};

function Toaster({ position = 'bottom-right', className }: ToasterProps) {
    const { appearance } = useAppearance();
    const [items, setItems] = React.useState<ToastItem[]>([]);

    useFlashToast();

    React.useEffect(() => {
        const listener: ToastListener = (next) => setItems(next);
        listeners.add(listener);
        setItems([...toastItems]);
        return () => {
            listeners.delete(listener);
        };
    }, []);

    if (typeof document === 'undefined' || items.length === 0) {
        // Hooks already run above; render nothing when empty.
        return null;
    }

    const positionClass =
        position === 'top-right'
            ? 'top-4 right-4'
            : position === 'top-left'
              ? 'top-4 left-4'
              : position === 'bottom-left'
                ? 'bottom-4 left-4'
                : 'bottom-4 right-4';

    return createPortal(
        <div
            data-slot="toaster"
            data-theme={appearance}
            className={cn('toaster group fixed z-[100] flex flex-col gap-2', positionClass, className)}
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                } as React.CSSProperties
            }
        >
            {items.map((item) => (
                <div
                    key={item.id}
                    role="status"
                    data-type={item.type}
                    className="bg-popover text-popover-foreground flex min-w-72 max-w-sm items-start gap-2 rounded-lg border p-3 shadow-lg animate-in fade-in-0 slide-in-from-bottom-4 duration-200"
                >
                    <span className="mt-0.5 shrink-0">{icons[item.type]}</span>
                    <p className="flex-1 text-sm">{item.message}</p>
                    <button
                        type="button"
                        aria-label="Tutup notifikasi"
                        onClick={() => dismissToast(item.id)}
                        className="rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
                    >
                        <X className="size-4" />
                    </button>
                </div>
            ))}
        </div>,
        document.body,
    );
}

export { Toaster };
