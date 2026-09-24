import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

type DropdownContextValue = {
    open: boolean;
    setOpen: (open: boolean) => void;
    menuId: string;
};

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

function useDropdown() {
    const ctx = React.useContext(DropdownContext);
    if (!ctx) {
        throw new Error('DropdownMenu components must be used within DropdownMenu');
    }
    return ctx;
}

type DropdownMenuProps = {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    children?: React.ReactNode;
};

function DropdownMenu({ open: openProp, defaultOpen = false, onOpenChange, children }: DropdownMenuProps) {
    const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
    // useId (bukan Math.random) agar ID sama persis antara SSR dan client.
    const reactId = React.useId();
    const menuId = `nx-dropdown-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
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

    const value = React.useMemo(
        () => ({ open, setOpen, menuId }),
        [open, setOpen, menuId],
    );

    React.useEffect(() => {
        if (!open) {
            return;
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(false);
            }
        };
        const onPointer = (e: PointerEvent) => {
            const target = e.target as HTMLElement | null;
            if (
                target &&
                !target.closest(
                    '[data-slot="dropdown-menu-content"], [data-dropdown-menu-trigger]',
                )
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onPointer);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onPointer);
        };
    }, [open, setOpen]);

    return (
        <DropdownContext.Provider value={value}>
            {children}
        </DropdownContext.Provider>
    );
}

function DropdownMenuPortal({ children }: { children?: React.ReactNode }) {
    return <>{children}</>;
}

function DropdownMenuTrigger({
    asChild = false,
    children,
    onClick,
    ...props
}: Omit<React.ComponentProps<'button'>, 'children'> & {
    asChild?: boolean;
    children?: React.ReactNode;
}) {
    const { open, setOpen, menuId } = useDropdown();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        (onClick as ((e: React.MouseEvent) => void) | undefined)?.(
            e as unknown as React.MouseEvent,
        );
        // Selalu toggle: Inertia Link selalu preventDefault, itu bukan alasan
        // untuk membatalkan buka/tutup menu.
        setOpen(!open);
    };

    const triggerAttrs = {
        'data-slot': 'dropdown-menu-trigger',
        'data-dropdown-menu-trigger': menuId,
        'data-state': open ? 'open' : 'closed',
        'aria-expanded': open,
        'aria-haspopup': 'menu' as const,
    };

    if (asChild && React.isValidElement(children)) {
        const child = children as React.ReactElement<{
            onClick?: (e: React.MouseEvent) => void;
        }>;
        return React.cloneElement(child, {
            ...props,
            ...triggerAttrs,
            onClick: (e: React.MouseEvent) => {
                child.props.onClick?.(e);
                handleClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
            },
        } as Record<string, unknown>);
    }

    return (
        <button {...triggerAttrs} onClick={handleClick} {...props}>
            {children}
        </button>
    );
}

type MenuSide = 'top' | 'right' | 'bottom' | 'left';
type MenuAlign = 'start' | 'center' | 'end';

function DropdownMenuContent({
    className,
    sideOffset = 4,
    align = 'center',
    side = 'bottom',
    children,
    style,
    ...props
}: Omit<React.ComponentProps<'div'>, 'children'> & {
    sideOffset?: number;
    align?: MenuAlign;
    side?: MenuSide;
    children?: React.ReactNode;
}) {
    const { open, setOpen, menuId } = useDropdown();
    const [triggerRect, setTriggerRect] = React.useState<DOMRect | null>(null);
    const [contentBox, setContentBox] = React.useState<{
        w: number;
        h: number;
    } | null>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!open || typeof document === 'undefined') {
            return;
        }
        const update = () => {
            const el = document.querySelector(
                `[data-dropdown-menu-trigger="${menuId}"]`,
            );
            if (el) {
                setTriggerRect(el.getBoundingClientRect());
            } else {
                setOpen(false);
            }
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [open, menuId, setOpen]);

    // Ukur dimensi konten setelah terpasang untuk kebutuhan flip viewport.
    React.useEffect(() => {
        if (open && contentRef.current) {
            setContentBox({
                w: contentRef.current.offsetWidth,
                h: contentRef.current.offsetHeight,
            });
        } else if (!open && contentBox) {
            setContentBox(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, triggerRect, children]);

    if (!open || typeof document === 'undefined' || !triggerRect) {
        return null;
    }

    const viewportW =
        typeof window === 'undefined' ? 1024 : window.innerWidth;
    const viewportH =
        typeof window === 'undefined' ? 768 : window.innerHeight;
    const contentW = contentBox?.w ?? 0;
    const contentH = contentBox?.h ?? 0;
    const margin = 8;

    // Collision flip ala Radix: balik sisi bila tidak muat dan sisi
    // seberangnya muat (mis. footer sidebar -> buka ke atas).
    let placedSide = side;
    if (
        side === 'bottom' &&
        contentH > 0 &&
        triggerRect.bottom + sideOffset + contentH > viewportH &&
        triggerRect.top - sideOffset - contentH >= 0
    ) {
        placedSide = 'top';
    } else if (
        side === 'top' &&
        contentH > 0 &&
        triggerRect.top - sideOffset - contentH < 0 &&
        triggerRect.bottom + sideOffset + contentH <= viewportH
    ) {
        placedSide = 'bottom';
    } else if (
        side === 'right' &&
        contentW > 0 &&
        triggerRect.right + sideOffset + contentW > viewportW &&
        triggerRect.left - sideOffset - contentW >= 0
    ) {
        placedSide = 'left';
    } else if (
        side === 'left' &&
        contentW > 0 &&
        triggerRect.left - sideOffset - contentW < 0 &&
        triggerRect.right + sideOffset + contentW <= viewportW
    ) {
        placedSide = 'right';
    }

    let top = 0;
    let left = 0;
    let transform = '';

    if (placedSide === 'bottom') {
        top = triggerRect.bottom + sideOffset;
        if (align === 'start') {
            left = triggerRect.left;
        } else if (align === 'end') {
            left = triggerRect.right;
            transform = 'translateX(-100%)';
        } else {
            left = triggerRect.left + triggerRect.width / 2;
            transform = 'translateX(-50%)';
        }
    } else if (placedSide === 'top') {
        top = triggerRect.top - sideOffset;
        transform = 'translateY(-100%)';
        if (align === 'start') {
            left = triggerRect.left;
        } else if (align === 'end') {
            left = triggerRect.right;
            transform += ' translateX(-100%)';
        } else {
            left = triggerRect.left + triggerRect.width / 2;
            transform += ' translateX(-50%)';
        }
    } else if (placedSide === 'right') {
        left = triggerRect.right + sideOffset;
        if (align === 'start') {
            top = triggerRect.top;
        } else if (align === 'end') {
            top = triggerRect.bottom;
            transform = 'translateY(-100%)';
        } else {
            top = triggerRect.top + triggerRect.height / 2;
            transform = 'translateY(-50%)';
        }
    } else {
        left = triggerRect.left - sideOffset;
        transform = 'translateX(-100%)';
        if (align === 'start') {
            top = triggerRect.top;
        } else if (align === 'end') {
            top = triggerRect.bottom;
            transform += ' translateY(-100%)';
        } else {
            top = triggerRect.top + triggerRect.height / 2;
            transform += ' translateY(-50%)';
        }
    }

    return createPortal(
        <div
            ref={contentRef}
            data-slot="dropdown-menu-content"
            data-state="open"
            data-side={placedSide}
            data-align={align}
            role="menu"
            className={cn(
                'bg-popover text-popover-foreground z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md',
                'animate-in fade-in-0 zoom-in-95 duration-150',
                'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
                className,
            )}
            style={{
                position: 'fixed',
                top,
                left,
                transform: transform || undefined,
                minWidth: Math.max(triggerRect.width, 0),
                // Sembunyikan satu frame pertama sampai dimensi terukur
                // agar tidak berkedip di posisi yang salah.
                visibility: contentBox ? 'visible' : 'hidden',
                ...style,
            }}
            {...props}
        >
            {children}
        </div>,
        document.body,
    );
}

function DropdownMenuGroup({ ...props }: React.ComponentProps<'div'>) {
    return <div data-slot="dropdown-menu-group" role="group" {...props} />;
}

type DropdownMenuItemProps = React.ComponentProps<'div'> & {
    inset?: boolean;
    variant?: 'default' | 'destructive';
    disabled?: boolean;
    asChild?: boolean;
    onSelect?: () => void;
};

function DropdownMenuItem({
    className,
    inset,
    variant = 'default',
    disabled,
    asChild = false,
    children,
    onSelect,
    onClick,
    ...props
}: DropdownMenuItemProps) {
    const { setOpen } = useDropdown();
    const classes = cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive-foreground data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/40 data-[variant=destructive]:focus:text-destructive-foreground data-[variant=destructive]:*:[svg]:!text-destructive-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        disabled && 'pointer-events-none opacity-50',
        className,
    );

    const handleClick = (e: React.MouseEvent) => {
        (onClick as ((e: React.MouseEvent) => void) | undefined)?.(e);
        if (disabled) {
            return;
        }
        onSelect?.();
        setOpen(false);
    };

    if (asChild && React.isValidElement(children)) {
        const child = children as React.ReactElement<{
            onClick?: (e: React.MouseEvent) => void;
            className?: string;
        }>;
        return React.cloneElement(child, {
            ...props,
            'data-slot': 'dropdown-menu-item',
            'data-inset': inset,
            'data-variant': variant,
            role: 'menuitem',
            className: [classes, child.props.className].filter(Boolean).join(' '),
            onClick: (e: React.MouseEvent) => {
                child.props.onClick?.(e);
                handleClick(e);
            },
        } as Record<string, unknown>);
    }

    return (
        <div
            data-slot="dropdown-menu-item"
            data-inset={inset}
            data-variant={variant}
            data-disabled={disabled}
            role="menuitem"
            tabIndex={disabled ? -1 : 0}
            onClick={handleClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick(e as unknown as React.MouseEvent);
                }
            }}
            className={classes}
            {...props}
        >
            {children}
        </div>
    );
}

function DropdownMenuCheckboxItem({
    className,
    children,
    checked = false,
    onCheckedChange,
    disabled,
    ...props
}: React.ComponentProps<'div'> & {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div
            data-slot="dropdown-menu-checkbox-item"
            data-state={checked ? 'checked' : 'unchecked'}
            role="menuitemcheckbox"
            aria-checked={checked}
            tabIndex={disabled ? -1 : 0}
            onClick={() => {
                if (!disabled) {
                    onCheckedChange?.(!checked);
                }
            }}
            className={cn(
                'focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
                disabled && 'pointer-events-none opacity-50',
                className,
            )}
            {...props}
        >
            <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
                {checked ? <CheckIcon className="size-4" /> : null}
            </span>
            {children}
        </div>
    );
}

function DropdownMenuRadioGroup({ ...props }: React.ComponentProps<'div'>) {
    return <div data-slot="dropdown-menu-radio-group" role="group" {...props} />;
}

function DropdownMenuRadioItem({
    className,
    children,
    checked = false,
    onSelect,
    ...props
}: React.ComponentProps<'div'> & {
    checked?: boolean;
    onSelect?: () => void;
}) {
    return (
        <div
            data-slot="dropdown-menu-radio-item"
            data-state={checked ? 'checked' : 'unchecked'}
            role="menuitemradio"
            aria-checked={checked}
            tabIndex={0}
            onClick={() => onSelect?.()}
            className={cn(
                'focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
                className,
            )}
            {...props}
        >
            <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
                {checked ? <CircleIcon className="size-2 fill-current" /> : null}
            </span>
            {children}
        </div>
    );
}

function DropdownMenuLabel({
    className,
    inset,
    ...props
}: React.ComponentProps<'div'> & {
    inset?: boolean;
}) {
    return (
        <div
            data-slot="dropdown-menu-label"
            data-inset={inset}
            className={cn('px-2 py-1.5 text-sm font-medium data-[inset]:pl-8', className)}
            {...props}
        />
    );
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="dropdown-menu-separator"
            role="separator"
            className={cn('bg-border -mx-1 my-1 h-px', className)}
            {...props}
        />
    );
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
    return (
        <span
            data-slot="dropdown-menu-shortcut"
            className={cn('text-muted-foreground ml-auto text-xs tracking-widest', className)}
            {...props}
        />
    );
}

function DropdownMenuSub({ children }: { children?: React.ReactNode }) {
    return <div data-slot="dropdown-menu-sub">{children}</div>;
}

function DropdownMenuSubTrigger({
    className,
    inset,
    children,
    ...props
}: React.ComponentProps<'div'> & {
    inset?: boolean;
}) {
    return (
        <div
            data-slot="dropdown-menu-sub-trigger"
            data-inset={inset}
            data-state="closed"
            className={cn(
                'focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8',
                className,
            )}
            {...props}
        >
            {children}
            <ChevronRightIcon className="ml-auto size-4" />
        </div>
    );
}

function DropdownMenuSubContent({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="dropdown-menu-sub-content"
            className={cn(
                'bg-popover text-popover-foreground z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg',
                className,
            )}
            {...props}
        />
    );
}

export {
    DropdownMenu,
    DropdownMenuPortal,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
};
