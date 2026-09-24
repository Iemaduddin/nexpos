import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow,transform] duration-100 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    {
        variants: {
            variant: {
                default:
                    'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
                destructive:
                    'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
                outline:
                    'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
                secondary:
                    'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-9 px-4 py-2 has-[>svg]:px-3',
                sm: 'h-8 rounded-md px-3 has-[>svg]:px-2.5',
                lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
                icon: 'size-9',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

function mergeClassNames(...classes: (string | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}

function Button({
    className,
    variant,
    size,
    asChild = false,
    type = 'button',
    children,
    ...props
}: React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    }) {
    const classes = cn(buttonVariants({ variant, size, className }));

    if (asChild && React.isValidElement(children)) {
        const child = children as React.ReactElement<{
            className?: string;
        }>;
        // PENTING: children sudah dikeluarkan dari ...props agar tidak menimpa
        // children asli milik child (mis. Inertia Link) yang akan menyebabkan
        // <a> bersarang dan hydration mismatch.
        return React.cloneElement(child, {
            ...props,
            className: mergeClassNames(classes, child.props.className),
        } as Record<string, unknown>);
    }

    if (asChild) {
        return (
            <span data-slot="button" className={classes} {...props}>
                {children}
            </span>
        );
    }

    return (
        <button
            data-slot="button"
            type={type}
            className={classes}
            {...props}
        >
            {children}
        </button>
    );
}

export { Button, buttonVariants };
