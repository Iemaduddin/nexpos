import * as React from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

type TooltipContextValue = {
    open: boolean;
    setOpen: (open: boolean) => void;
};

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

type TooltipProps = {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    delayDuration?: number;
    children?: React.ReactNode;
};

function TooltipProvider({
    delayDuration: _delayDuration = 0,
    children,
}: {
    delayDuration?: number;
    children?: React.ReactNode;
}) {
    return <>{children}</>;
}

function Tooltip({
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    children,
}: TooltipProps) {
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

    return (
        <TooltipContext.Provider value={value}>
            {/* display:contents agar tidak mengubah layout trigger (mis. tombol menu w-full tetap full-width) */}
            <span
                data-slot="tooltip"
                className="contents"
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
            >
                {children}
            </span>
        </TooltipContext.Provider>
    );
}

function TooltipTrigger({
    asChild = false,
    children,
    ...props
}: Omit<React.ComponentProps<'span'>, 'children'> & {
    asChild?: boolean;
    children?: React.ReactNode;
}) {
    const ctx = React.useContext(TooltipContext);

    const triggerProps = {
        'data-slot': 'tooltip-trigger',
        onMouseEnter: () => ctx?.setOpen(true),
        onFocus: () => ctx?.setOpen(true),
    };

    if (asChild && React.isValidElement(children)) {
        const child = children as React.ReactElement<Record<string, unknown>>;
        const prevEnter = (child.props.onMouseEnter as (() => void) | undefined);
        const prevFocus = (child.props.onFocus as (() => void) | undefined);
        return React.cloneElement(child, {
            ...triggerProps,
            ...props,
            onMouseEnter: (...args: unknown[]) => {
                (prevEnter as ((...a: unknown[]) => void) | undefined)?.(...args);
                triggerProps.onMouseEnter();
            },
            onFocus: (...args: unknown[]) => {
                (prevFocus as ((...a: unknown[]) => void) | undefined)?.(...args);
                triggerProps.onFocus();
            },
        });
    }

    return (
        <span {...triggerProps} {...props}>
            {children}
        </span>
    );
}

function TooltipContent({
    className,
    sideOffset = 4,
    side = 'top',
    align = 'center',
    hidden,
    children,
    ...props
}: React.ComponentProps<'div'> & {
    sideOffset?: number;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    hidden?: boolean;
}) {
    const ctx = React.useContext(TooltipContext);
    const [pos, setPos] = React.useState<{ top: number; left: number } | null>(
        null,
    );
    const triggerRef = React.useRef<HTMLElement | null>(null);

    React.useEffect(() => {
        if (!ctx?.open || hidden || typeof document === 'undefined') {
            return;
        }
        const id = requestAnimationFrame(() => {
            const trigger = document.querySelector(
                '[data-slot="tooltip-trigger"]:hover, [data-slot="tooltip-trigger"]:focus-within',
            ) as HTMLElement | null;
            if (trigger) {
                triggerRef.current = trigger;
                const rect = trigger.getBoundingClientRect();
                let top = rect.top - 8;
                let left = rect.left + rect.width / 2;
                if (side === 'right') {
                    top = rect.top + rect.height / 2;
                    left = rect.right + sideOffset;
                } else if (side === 'left') {
                    top = rect.top + rect.height / 2;
                    left = rect.left - sideOffset;
                } else if (side === 'bottom') {
                    top = rect.bottom + sideOffset;
                    left = rect.left + rect.width / 2;
                } else {
                    top = rect.top - sideOffset;
                    left = rect.left + rect.width / 2;
                }
                if (align === 'start') {
                    left = rect.left;
                } else if (align === 'end') {
                    left = rect.right;
                }
                setPos({ top, left });
            }
        });
        return () => cancelAnimationFrame(id);
    }, [ctx?.open, hidden, side, sideOffset, align]);

    if (!ctx?.open || hidden || typeof document === 'undefined') {
        return null;
    }

    const translate =
        side === 'right'
            ? 'translate(0, -50%)'
            : side === 'left'
              ? 'translate(-100%, -50%)'
              : side === 'bottom'
                ? 'translate(-50%, 0)'
                : 'translate(-50%, -100%)';

    return createPortal(
        <div
            data-slot="tooltip-content"
            data-side={side}
            data-align={align}
            role="tooltip"
            className={cn(
                'bg-primary text-primary-foreground z-50 max-w-sm rounded-md px-3 py-1.5 text-xs',
                'animate-in fade-in-0 zoom-in-95 duration-150',
                className,
            )}
            style={{
                position: 'fixed',
                top: pos?.top ?? 0,
                left: pos?.left ?? 0,
                transform: translate,
                pointerEvents: 'none',
                opacity: pos ? 1 : 0,
            }}
            {...props}
        >
            {children}
            <div className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
        </div>,
        document.body,
    );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
