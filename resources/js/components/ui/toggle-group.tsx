import { type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { toggleVariants } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';

type ToggleGroupType = 'single' | 'multiple';

const ToggleGroupContext = React.createContext<
    VariantProps<typeof toggleVariants> & {
        type?: ToggleGroupType;
        value?: string | string[];
        onValueChange?: (value: string | string[]) => void;
    }
>({
    size: 'default',
    variant: 'default',
    type: 'single',
});

type ToggleGroupProps = Omit<React.ComponentProps<'div'>, 'onChange'> &
    VariantProps<typeof toggleVariants> & {
        type?: ToggleGroupType;
        value?: string | string[];
        defaultValue?: string | string[];
        onValueChange?: (value: string | string[]) => void;
    };

function ToggleGroup({
    className,
    variant,
    size,
    type = 'single',
    value: valueProp,
    defaultValue,
    onValueChange,
    children,
    ...props
}: ToggleGroupProps) {
    const [uncontrolled, setUncontrolled] = React.useState<
        string | string[] | undefined
    >(defaultValue ?? (type === 'multiple' ? [] : undefined));
    const controlled = valueProp !== undefined;
    const value = controlled ? valueProp : uncontrolled;

    const handleChange = React.useCallback(
        (next: string | string[]) => {
            if (!controlled) {
                setUncontrolled(next);
            }
            onValueChange?.(next);
        },
        [controlled, onValueChange],
    );

    const context = React.useMemo(
        () => ({ variant, size, type, value, onValueChange: handleChange }),
        [variant, size, type, value, handleChange],
    );

    return (
        <div
            data-slot="toggle-group"
            data-variant={variant}
            data-size={size}
            role="group"
            className={cn(
                'group/toggle-group flex items-center rounded-md data-[variant=outline]:shadow-xs',
                className,
            )}
            {...props}
        >
            <ToggleGroupContext.Provider value={context}>
                {children}
            </ToggleGroupContext.Provider>
        </div>
    );
}

type ToggleGroupItemProps = Omit<React.ComponentProps<'button'>, 'value'> &
    VariantProps<typeof toggleVariants> & {
        value: string;
    };

function ToggleGroupItem({
    className,
    children,
    variant,
    size,
    value: itemValue,
    disabled,
    onClick,
    ...props
}: ToggleGroupItemProps) {
    const context = React.useContext(ToggleGroupContext);
    const resolvedVariant = context.variant || variant;
    const resolvedSize = context.size || size;

    const isPressed = Array.isArray(context.value)
        ? context.value.includes(itemValue)
        : context.value === itemValue;

    return (
        <button
            data-slot="toggle-group-item"
            data-variant={resolvedVariant}
            data-size={resolvedSize}
            data-state={isPressed ? 'on' : 'off'}
            aria-pressed={isPressed}
            disabled={disabled}
            onClick={(e) => {
                onClick?.(e);
                if (e.defaultPrevented || disabled) {
                    return;
                }
                if (context.type === 'multiple') {
                    const current = Array.isArray(context.value)
                        ? context.value
                        : [];
                    const next = isPressed
                        ? current.filter((v) => v !== itemValue)
                        : [...current, itemValue];
                    context.onValueChange?.(next);
                } else {
                    context.onValueChange?.(isPressed ? '' : itemValue);
                }
            }}
            className={cn(
                toggleVariants({
                    variant: resolvedVariant,
                    size: resolvedSize,
                }),
                'min-w-0 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l',
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
}

export { ToggleGroup, ToggleGroupItem };
