import { XIcon } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

type SheetContextValue = {
    open: boolean;
    setOpen: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheet() {
    const ctx = React.useContext(SheetContext);
    if (!ctx) {
        throw new Error('Sheet components must be used within Sheet');
    }
    return ctx;
}

type SheetProps = {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    children?: React.ReactNode;
};

function Sheet({ open: openProp, defaultOpen = false, onOpenChange, children }: SheetProps) {
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

    return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>;
}

function SheetTrigger({
    asChild = false,
    children,
    onClick,
    ...props
}: Omit<React.ComponentProps<'button'>, 'children'> & {
    asChild?: boolean;
    children?: React.ReactNode;
}) {
    const { setOpen } = useSheet();

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
            'data-slot': 'sheet-trigger',
            onClick: (e: React.MouseEvent) => {
                child.props.onClick?.(e);
                handleClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
            },
        } as Record<string, unknown>);
    }

    return (
        <button data-slot="sheet-trigger" onClick={handleClick} {...props}>
            {children}
        </button>
    );
}

function SheetClose({
    asChild = false,
    children,
    onClick,
    ...props
}: Omit<React.ComponentProps<'button'>, 'children'> & {
    asChild?: boolean;
    children?: React.ReactNode;
}) {
    const { setOpen } = useSheet();

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
            'data-slot': 'sheet-close',
            onClick: (e: React.MouseEvent) => {
                child.props.onClick?.(e);
                handleClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
            },
        } as Record<string, unknown>);
    }

    return (
        <button data-slot="sheet-close" onClick={handleClick} {...props}>
            {children}
        </button>
    );
}

function SheetPortal({ children }: { children?: React.ReactNode }) {
    return <>{children}</>;
}

function SheetOverlay({ className, ...props }: React.ComponentProps<'div'>) {
    const { setOpen } = useSheet();
    return (
        <div
            data-slot="sheet-overlay"
            data-state="open"
            onClick={() => setOpen(false)}
            className={cn(
                'fixed inset-0 z-50 bg-black/80',
                'animate-in fade-in-0 duration-200',
                className,
            )}
            {...props}
        />
    );
}

function SheetContent({
    className,
    children,
    side = 'right',
    ...props
}: React.ComponentProps<'div'> & {
    side?: 'top' | 'right' | 'bottom' | 'left';
}) {
    const { open, setOpen } = useSheet();
    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false);
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
    }, [open, setOpen]);

    if (!open || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div data-slot="sheet-portal">
            <SheetOverlay />
            <div
                ref={contentRef}
                data-slot="sheet-content"
                data-state="open"
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
                className={cn(
                    'bg-background fixed z-50 flex flex-col gap-4 shadow-lg',
                    'animate-in fade-in-0 duration-300 ease-out',
                    side === 'right' &&
                        'inset-y-0 right-0 h-full w-3/4 border-l slide-in-from-right sm:max-w-sm',
                    side === 'left' &&
                        'inset-y-0 left-0 h-full w-3/4 border-r slide-in-from-left sm:max-w-sm',
                    side === 'top' &&
                        'inset-x-0 top-0 h-auto border-b slide-in-from-top',
                    side === 'bottom' &&
                        'inset-x-0 bottom-0 h-auto border-t slide-in-from-bottom',
                    className,
                )}
                {...props}
            >
                {children}
                <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setOpen(false)}
                    className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
                >
                    <XIcon className="size-4" />
                    <span className="sr-only">Close</span>
                </button>
            </div>
        </div>,
        document.body,
    );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="sheet-header"
            className={cn('flex flex-col gap-1.5 p-4', className)}
            {...props}
        />
    );
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="sheet-footer"
            className={cn('mt-auto flex flex-col gap-2 p-4', className)}
            {...props}
        />
    );
}

function SheetTitle({ className, ...props }: React.ComponentProps<'h2'>) {
    return (
        <h2
            data-slot="sheet-title"
            className={cn('text-foreground font-semibold', className)}
            {...props}
        />
    );
}

function SheetDescription({ className, ...props }: React.ComponentProps<'p'>) {
    return (
        <p
            data-slot="sheet-description"
            className={cn('text-muted-foreground text-sm', className)}
            {...props}
        />
    );
}

export {
    Sheet,
    SheetTrigger,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetFooter,
    SheetTitle,
    SheetDescription,
    SheetPortal,
    SheetOverlay,
};
