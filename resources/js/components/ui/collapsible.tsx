import * as React from 'react';

type CollapsibleContextValue = {
    open: boolean;
    toggle: () => void;
    setOpen: (open: boolean) => void;
};

const CollapsibleContext =
    React.createContext<CollapsibleContextValue | null>(null);

function useCollapsible() {
    const ctx = React.useContext(CollapsibleContext);
    if (!ctx) {
        throw new Error('Collapsible components must be used within Collapsible');
    }
    return ctx;
}

type CollapsibleProps = {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    children?: React.ReactNode;
    className?: string;
};

function Collapsible({
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    children,
    ...props
}: CollapsibleProps & Omit<React.ComponentProps<'div'>, 'children'>) {
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

    const toggle = React.useCallback(() => setOpen(!open), [open, setOpen]);

    const value = React.useMemo(
        () => ({ open, toggle, setOpen }),
        [open, toggle, setOpen],
    );

    return (
        <CollapsibleContext.Provider value={value}>
            <div data-slot="collapsible" data-state={open ? 'open' : 'closed'} {...props}>
                {children}
            </div>
        </CollapsibleContext.Provider>
    );
}

function CollapsibleTrigger({
    asChild = false,
    children,
    onClick,
    ...props
}: Omit<React.ComponentProps<'button'>, 'children'> & {
    asChild?: boolean;
    children?: React.ReactNode;
}) {
    const { open, toggle } = useCollapsible();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        (onClick as ((e: React.MouseEvent) => void) | undefined)?.(
            e as unknown as React.MouseEvent,
        );
        toggle();
    };

    if (asChild && React.isValidElement(children)) {
        const child = children as React.ReactElement<{
            onClick?: (e: React.MouseEvent) => void;
            'aria-expanded'?: boolean;
            'data-state'?: string;
        }>;
        return React.cloneElement(child, {
            ...props,
            'aria-expanded': open,
            'data-state': open ? 'open' : 'closed',
            'data-slot': 'collapsible-trigger',
            onClick: (e: React.MouseEvent) => {
                child.props.onClick?.(e);
                handleClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
            },
        } as Record<string, unknown>);
    }

    return (
        <button
            data-slot="collapsible-trigger"
            data-state={open ? 'open' : 'closed'}
            aria-expanded={open}
            onClick={handleClick}
            {...props}
        >
            {children}
        </button>
    );
}

function CollapsibleContent({
    children,
    className,
    ...props
}: Omit<React.ComponentProps<'div'>, 'children'> & {
    children?: React.ReactNode;
}) {
    const { open } = useCollapsible();

    // Grid-rows 0fr<->1fr agar buka/tutup beranimasi mulus tanpa unmount.
    return (
        <div
            data-slot="collapsible-content"
            data-state={open ? 'open' : 'closed'}
            className={`grid transition-[grid-template-rows] duration-200 ease-out data-[state=closed]:grid-rows-[0fr] data-[state=open]:grid-rows-[1fr] ${className ?? ''}`}
            {...props}
        >
            <div className="min-h-0 overflow-hidden" inert={!open}>
                {children}
            </div>
        </div>
    );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
