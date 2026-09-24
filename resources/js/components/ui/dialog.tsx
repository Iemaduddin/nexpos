import { XIcon } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

type DialogContextValue = {
    open: boolean;
    setOpen: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialog() {
    const ctx = React.useContext(DialogContext);
    if (!ctx) {
        throw new Error('Dialog components must be used within Dialog');
    }
    return ctx;
}

type DialogProps = {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    children?: React.ReactNode;
};

function Dialog({ open: openProp, defaultOpen = false, onOpenChange, children }: DialogProps) {
    const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
    const controlled = openProp !== undefined;
    const open = controlled ? openProp : uncontrolled;

    const setOpen = React.useCallback(
        (next: boolean) => {
            if (!controlled) {
                setUncontrolled(next);
            }
            onOpenChange?.(next);
        },
        [controlled, onOpenChange],
    );

    const value = React.useMemo(() => ({ open, setOpen }), [open, setOpen]);

    return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

function DialogTrigger({
    asChild = false,
    children,
    onClick,
    ...props
}: Omit<React.ComponentProps<'button'>, 'children'> & {
    asChild?: boolean;
    children?: React.ReactNode;
}) {
    const { setOpen } = useDialog();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        (onClick as ((e: React.MouseEvent) => void) | undefined)?.(
            e as unknown as React.MouseEvent,
        );
        setOpen(true);
    };

    if (asChild && React.isValidElement(children)) {
        const child = children as React.ReactElement<{
            onClick?: (e: React.MouseEvent) => void;
        }>;
        return React.cloneElement(child, {
            ...props,
            'data-slot': 'dialog-trigger',
            onClick: (e: React.MouseEvent) => {
                child.props.onClick?.(e);
                handleClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
            },
        } as Record<string, unknown>);
    }

    return (
        <button data-slot="dialog-trigger" onClick={handleClick} {...props}>
            {children}
        </button>
    );
}

function DialogPortal({ children }: { children?: React.ReactNode }) {
    return <>{children}</>;
}

function DialogClose({
    asChild = false,
    children,
    onClick,
    ...props
}: Omit<React.ComponentProps<'button'>, 'children'> & {
    asChild?: boolean;
    children?: React.ReactNode;
}) {
    const { setOpen } = useDialog();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        (onClick as ((e: React.MouseEvent) => void) | undefined)?.(
            e as unknown as React.MouseEvent,
        );
        setOpen(false);
    };

    if (asChild && React.isValidElement(children)) {
        const child = children as React.ReactElement<{
            onClick?: (e: React.MouseEvent) => void;
        }>;
        return React.cloneElement(child, {
            ...props,
            'data-slot': 'dialog-close',
            onClick: (e: React.MouseEvent) => {
                child.props.onClick?.(e);
                handleClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
            },
        } as Record<string, unknown>);
    }

    return (
        <button data-slot="dialog-close" onClick={handleClick} {...props}>
            {children}
        </button>
    );
}

function DialogOverlay({ className, ...props }: React.ComponentProps<'div'>) {
    const { setOpen } = useDialog();
    return (
        <div
            data-slot="dialog-overlay"
            data-state="open"
            className={cn(
                'fixed inset-0 z-50 bg-black/80',
                'animate-in fade-in-0 duration-200',
                className,
            )}
            onClick={() => setOpen(false)}
            {...props}
        />
    );
}

function DialogContent({
    className,
    children,
    onEscapeKeyDown,
    onPointerDownOutside,
    ...props
}: React.ComponentProps<'div'> & {
    onEscapeKeyDown?: (e: KeyboardEvent) => void;
    onPointerDownOutside?: (e: PointerEvent) => void;
}) {
    const { open, setOpen } = useDialog();
    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onEscapeKeyDown?.(e);
                if (!e.defaultPrevented) {
                    setOpen(false);
                }
            }
        };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        contentRef.current?.focus();
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, setOpen, onEscapeKeyDown]);

    if (!open || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div data-slot="dialog-portal">
            <DialogOverlay />
            <div
                ref={contentRef}
                data-slot="dialog-content"
                data-state="open"
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => {
                    if (e.target === e.currentTarget) {
                        onPointerDownOutside?.(e.nativeEvent as unknown as PointerEvent);
                    }
                }}
                className={cn(
                    'bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg sm:max-w-lg',
                    'animate-in fade-in-0 zoom-in-95 duration-200',
                    className,
                )}
                {...props}
            >
                {children}
                <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setOpen(false)}
                    className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
                >
                    <XIcon />
                    <span className="sr-only">Close</span>
                </button>
            </div>
        </div>,
        document.body,
    );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="dialog-header"
            className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
            {...props}
        />
    );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="dialog-footer"
            className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
            {...props}
        />
    );
}

function DialogTitle({ className, ...props }: React.ComponentProps<'h2'>) {
    return (
        <h2
            data-slot="dialog-title"
            className={cn('text-lg leading-none font-semibold', className)}
            {...props}
        />
    );
}

function DialogDescription({ className, ...props }: React.ComponentProps<'p'>) {
    return (
        <p
            data-slot="dialog-description"
            className={cn('text-muted-foreground text-sm', className)}
            {...props}
        />
    );
}

export {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
};
