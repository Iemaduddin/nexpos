import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

type SelectContextValue = {
    open: boolean;
    setOpen: (open: boolean) => void;
    value?: string;
    onValueChange?: (value: string) => void;
    search: string;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelect() {
    const ctx = React.useContext(SelectContext);
    if (!ctx) {
        throw new Error('Select components must be used within Select');
    }
    return ctx;
}

type SelectProps = {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    disabled?: boolean;
    name?: string;
    children?: React.ReactNode;
};

function Select({
    value: valueProp,
    defaultValue,
    onValueChange,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    disabled,
    name,
    children,
}: SelectProps) {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? '');
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
    const controlledValue = valueProp !== undefined;
    const controlledOpen = openProp !== undefined;
    const value = controlledValue ? valueProp : uncontrolledValue;
    const open = controlledOpen ? openProp : uncontrolledOpen;

    const setOpen = React.useCallback(
        (next: boolean) => {
            if (disabled) {
                return;
            }
            if (!controlledOpen) {
                setUncontrolledOpen(next);
            }
            onOpenChange?.(next);
        },
        [controlledOpen, onOpenChange, disabled],
    );

    const handleValueChange = React.useCallback(
        (next: string) => {
            if (!controlledValue) {
                setUncontrolledValue(next);
            }
            onValueChange?.(next);
            setOpen(false);
        },
        [controlledValue, onValueChange, setOpen],
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
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, setOpen]);

    const ctx = React.useMemo(
        () => ({ open, setOpen, value, onValueChange: handleValueChange, search: '' }),
        [open, setOpen, value, handleValueChange],
    );

    return (
        <SelectContext.Provider value={ctx}>
            <span data-slot="select" className="inline-flex" data-disabled={disabled}>
                {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}
                {children}
            </span>
        </SelectContext.Provider>
    );
}

function SelectGroup({ ...props }: React.ComponentProps<'div'>) {
    return <div data-slot="select-group" role="group" {...props} />;
}

function SelectValue({
    placeholder,
    children,
}: {
    placeholder?: string;
    children?: React.ReactNode;
}) {
    const { value } = useSelect();
    return (
        <span data-slot="select-value">
            {children ?? value ?? placeholder ?? ''}
        </span>
    );
}

function SelectTrigger({
    className,
    size = 'default',
    children,
    disabled,
    ...props
}: React.ComponentProps<'button'> & {
    size?: 'sm' | 'default';
}) {
    const { open, setOpen, value } = useSelect();
    return (
        <button
            data-slot="select-trigger"
            data-size={size}
            data-state={open ? 'open' : 'closed'}
            type="button"
            disabled={disabled}
            aria-expanded={open}
            aria-haspopup="listbox"
            onClick={() => setOpen(!open)}
            className={cn(
                "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}
        >
            {children ?? (
                <span data-slot="select-value" data-placeholder={!value}>
                    {value ?? ''}
                </span>
            )}
            <ChevronDownIcon className="size-4 opacity-50" aria-hidden="true" />
        </button>
    );
}

function SelectContent({
    className,
    children,
    position: _position = 'popper',
    side: _side = 'bottom',
    sideOffset: _sideOffset = 4,
    align: _align = 'center',
    ...props
}: React.ComponentProps<'div'> & {
    position?: 'popper' | 'item-aligned';
    side?: 'top' | 'right' | 'bottom' | 'left';
    sideOffset?: number;
    align?: 'start' | 'center' | 'end';
}) {
    const { open, setOpen } = useSelect();

    if (!open || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div
            data-slot="select-overlay"
            className="fixed inset-0 z-50"
            onClick={() => setOpen(false)}
        >
            <div
                data-slot="select-content"
                data-state="open"
                role="listbox"
                onClick={(e) => e.stopPropagation()}
                className={cn(
                    'bg-popover text-popover-foreground relative z-50 max-h-72 min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border shadow-md',
                    'absolute top-full mt-1 w-full',
                    'animate-in fade-in-0 zoom-in-95 duration-150',
                    className,
                )}
                style={{ position: 'fixed' }}
                {...props}
            >
                <SelectScrollUpButton />
                <div className="p-1">{children}</div>
                <SelectScrollDownButton />
            </div>
        </div>,
        document.body,
    );
}

function SelectLabel({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="select-label"
            className={cn('text-muted-foreground px-2 py-1.5 text-xs', className)}
            {...props}
        />
    );
}

function SelectItem({
    className,
    children,
    value,
    disabled,
    onSelect,
    ...props
}: React.ComponentProps<'div'> & {
    value: string;
    disabled?: boolean;
    onSelect?: (value: string) => void;
}) {
    const { value: selected, onValueChange } = useSelect();
    const isSelected = selected === value;

    return (
        <div
            data-slot="select-item"
            data-state={isSelected ? 'checked' : 'unchecked'}
            data-disabled={disabled}
            role="option"
            aria-selected={isSelected}
            tabIndex={disabled ? -1 : 0}
            onClick={() => {
                if (disabled) {
                    return;
                }
                onSelect?.(value);
                onValueChange?.(value);
            }}
            onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                    e.preventDefault();
                    onSelect?.(value);
                    onValueChange?.(value);
                }
            }}
            className={cn(
                "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
                className,
            )}
            {...props}
        >
            <span
                data-slot="select-item-indicator"
                className="absolute right-2 flex size-3.5 items-center justify-center"
            >
                {isSelected ? <CheckIcon className="size-4" /> : null}
            </span>
            <span data-slot="select-item-text">{children}</span>
        </div>
    );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="select-separator"
            role="separator"
            className={cn('bg-border pointer-events-none -mx-1 my-1 h-px', className)}
            {...props}
        />
    );
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="select-scroll-up-button"
            className={cn('flex cursor-default items-center justify-center py-1', className)}
            {...props}
        >
            <ChevronUpIcon className="size-4" />
        </div>
    );
}

function SelectScrollDownButton({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="select-scroll-down-button"
            className={cn('flex cursor-default items-center justify-center py-1', className)}
            {...props}
        >
            <ChevronDownIcon className="size-4" />
        </div>
    );
}

export {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectScrollDownButton,
    SelectScrollUpButton,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
};
