import { cva } from 'class-variance-authority';
import { ChevronDownIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const NavigationMenuContext = React.createContext<{
    openValue: string | null;
    setOpenValue: (v: string | null) => void;
} | null>(null);

function NavigationMenu({
    className,
    children,
    viewport = true,
    ...props
}: React.ComponentProps<'nav'> & {
    viewport?: boolean;
    value?: string | null;
    onValueChange?: (value: string | null) => void;
}) {
    const [uncontrolled, setUncontrolled] = React.useState<string | null>(null);
    const controlled =
        (props as { value?: string | null }).value !== undefined;
    const openValue = controlled
        ? ((props as { value?: string | null }).value ?? null)
        : uncontrolled;

    const setOpenValue = React.useCallback(
        (v: string | null) => {
            if (!controlled) {
                setUncontrolled(v);
            }
            (props as { onValueChange?: (v: string | null) => void }).onValueChange?.(
                v,
            );
        },
        [controlled, props],
    );

    const value = React.useMemo(
        () => ({ openValue, setOpenValue }),
        [openValue, setOpenValue],
    );

    return (
        <NavigationMenuContext.Provider value={value}>
            <nav
                data-slot="navigation-menu"
                data-viewport={viewport}
                className={cn(
                    'group/navigation-menu relative flex max-w-max flex-1 items-center justify-center',
                    className,
                )}
                {...props}
            >
                {children}
                {viewport ? <NavigationMenuViewport /> : null}
            </nav>
        </NavigationMenuContext.Provider>
    );
}

function NavigationMenuList({
    className,
    ...props
}: React.ComponentProps<'ul'>) {
    return (
        <ul
            data-slot="navigation-menu-list"
            className={cn(
                'group flex flex-1 list-none items-center justify-center gap-1',
                className,
            )}
            {...props}
        />
    );
}

function NavigationMenuItem({
    className,
    value,
    ...props
}: React.ComponentProps<'li'> & { value?: string }) {
    return (
        <li
            data-slot="navigation-menu-item"
            data-value={value}
            className={cn('relative', className)}
            {...props}
        />
    );
}

const navigationMenuTriggerStyle = cva(
    'group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-[active=true]:bg-accent/50 data-[state=open]:bg-accent/50 data-[active=true]:text-accent-foreground ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 transition-[color,box-shadow] focus-visible:ring-4 focus-visible:outline-1',
);

function NavigationMenuTrigger({
    className,
    children,
    ...props
}: React.ComponentProps<'button'>) {
    const ctx = React.useContext(NavigationMenuContext);
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
        if (!open) {
            ctx?.setOpenValue(null);
        }
    }, [open, ctx]);

    return (
        <button
            data-slot="navigation-menu-trigger"
            data-state={open ? 'open' : 'closed'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            onMouseEnter={() => setOpen(true)}
            className={cn(navigationMenuTriggerStyle(), 'group', className)}
            {...props}
        >
            {children}{' '}
            <ChevronDownIcon
                className="relative top-[1px] ml-1 size-3 transition duration-300 group-data-[state=open]:rotate-180"
                aria-hidden="true"
            />
        </button>
    );
}

function NavigationMenuContent({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="navigation-menu-content"
            className={cn('top-0 left-0 w-full p-2 pr-2.5 md:absolute md:w-auto', className)}
            {...props}
        />
    );
}

function NavigationMenuViewport({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    return (
        <div className={cn('absolute top-full left-0 isolate z-50 flex justify-center')}>
            <div
                data-slot="navigation-menu-viewport"
                className={cn(
                    'origin-top-center bg-popover text-popover-foreground relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border shadow md:w-[var(--radix-navigation-menu-viewport-width)]',
                    className,
                )}
                {...props}
            />
        </div>
    );
}

function NavigationMenuLink({
    className,
    ...props
}: React.ComponentProps<'a'> & { active?: boolean }) {
    const { active: _active, ...rest } = props as React.ComponentProps<'a'> & {
        active?: boolean;
    };
    return (
        <a
            data-slot="navigation-menu-link"
            data-active={_active}
            className={cn(
                'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[active=true]:bg-accent/50 data-[active=true]:text-accent-foreground ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 [&_svg:not([class*=text-)]]:text-muted-foreground flex flex-col gap-1 rounded-sm p-2 text-sm transition-[color,box-shadow] focus-visible:ring-4 focus-visible:outline-1 [&_svg:not([class*=size-])]:size-4',
                className,
            )}
            {...rest}
        />
    );
}

function NavigationMenuIndicator({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="navigation-menu-indicator"
            className={cn(
                'top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden',
                className,
            )}
            {...props}
        >
            <div className="bg-border relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm shadow-md" />
        </div>
    );
}

export {
    NavigationMenu,
    NavigationMenuList,
    NavigationMenuItem,
    NavigationMenuContent,
    NavigationMenuTrigger,
    NavigationMenuLink,
    NavigationMenuIndicator,
    NavigationMenuViewport,
    navigationMenuTriggerStyle,
};
