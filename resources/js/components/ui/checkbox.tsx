import { CheckIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

type CheckboxProps = Omit<
    React.ComponentProps<'button'>,
    'onChange' | 'checked' | 'defaultChecked'
> & {
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    name?: string;
    value?: string;
};

function Checkbox({
    className,
    checked: checkedProp,
    defaultChecked = false,
    onCheckedChange,
    disabled,
    name,
    value = 'on',
    id,
    onClick,
    ...props
}: CheckboxProps) {
    const [uncontrolled, setUncontrolled] = React.useState(defaultChecked);
    const controlled = checkedProp !== undefined;
    const checked = controlled ? checkedProp : uncontrolled;

    const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || disabled) {
            return;
        }
        const next = !checked;
        if (!controlled) {
            setUncontrolled(next);
        }
        onCheckedChange?.(next);
    };

    return (
        <span className="inline-flex items-center" data-slot="checkbox-wrapper">
            {name ? (
                <input
                    type="checkbox"
                    id={id}
                    name={name}
                    value={value}
                    checked={checked}
                    disabled={disabled}
                    readOnly
                    className="sr-only"
                    aria-hidden="true"
                    tabIndex={-1}
                />
            ) : null}
            <button
                data-slot="checkbox"
                data-state={checked ? 'checked' : 'unchecked'}
                role="checkbox"
                aria-checked={checked}
                id={id}
                disabled={disabled}
                onClick={toggle}
                className={cn(
                    'peer border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
                    className,
                )}
                {...props}
            >
                <span
                    data-slot="checkbox-indicator"
                    className="flex items-center justify-center text-current transition-none"
                >
                    {checked ? (
                        <CheckIcon className="size-3.5 animate-in zoom-in-50 duration-100" />
                    ) : null}
                </span>
            </button>
        </span>
    );
}

export { Checkbox };
