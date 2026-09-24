import { Minus } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

export const REGEXP_ONLY_DIGITS = '^[0-9]*$';

type OTPContextValue = {
    value: string;
    slots: { char: string | null; hasFakeCaret: boolean; isActive: boolean }[];
    focusedIndex: number;
    setFocusedIndex: (i: number) => void;
};

const OTPContext = React.createContext<OTPContextValue | null>(null);

type InputOTPProps = Omit<React.ComponentProps<'div'>, 'onChange'> & {
    maxLength?: number;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    onComplete?: (value: string) => void;
    disabled?: boolean;
    pattern?: string | RegExp;
    name?: string;
    id?: string;
    autoFocus?: boolean;
    containerClassName?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
};

function patternToRegExp(pattern?: string | RegExp): RegExp | null {
    if (!pattern) {
        return null;
    }
    if (pattern instanceof RegExp) {
        return pattern;
    }
    if (pattern === REGEXP_ONLY_DIGITS) {
        return /^[0-9]$/;
    }
    try {
        return new RegExp(pattern);
    } catch {
        return null;
    }
}

const InputOTP = React.forwardRef<HTMLDivElement, InputOTPProps>(
    (
        {
            className,
            containerClassName,
            maxLength = 6,
            value: valueProp,
            defaultValue = '',
            onChange,
            onComplete,
            disabled,
            pattern,
            name,
            id,
            autoFocus,
            children,
            ...props
        },
        ref,
    ) => {
        const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
        const [focusedIndex, setFocusedIndex] = React.useState(autoFocus ? 0 : -1);
        const inputsRef = React.useRef<(HTMLInputElement | null)[]>([]);
        const controlled = valueProp !== undefined;
        const value = controlled ? valueProp : uncontrolled;
        const charRe = React.useMemo(() => patternToRegExp(pattern), [pattern]);

        const setValue = React.useCallback(
            (next: string) => {
                const sliced = next.slice(0, maxLength);
                if (!controlled) {
                    setUncontrolled(sliced);
                }
                onChange?.(sliced);
                if (sliced.length === maxLength) {
                    onComplete?.(sliced);
                }
            },
            [controlled, maxLength, onChange, onComplete],
        );

        const focusAt = React.useCallback(
            (index: number) => {
                const clamped = Math.max(0, Math.min(index, maxLength - 1));
                setFocusedIndex(clamped);
                requestAnimationFrame(() => {
                    inputsRef.current[clamped]?.focus();
                    inputsRef.current[clamped]?.select();
                });
            },
            [maxLength],
        );

        const slots = React.useMemo(
            () =>
                Array.from({ length: maxLength }, (_, i) => ({
                    char: value[i] ?? null,
                    hasFakeCaret: focusedIndex === i && !(value[i] ?? null),
                    isActive: focusedIndex === i,
                })),
            [maxLength, value, focusedIndex],
        );

        const ctx = React.useMemo(
            () => ({ value, slots, focusedIndex, setFocusedIndex }),
            [value, slots, focusedIndex],
        );

        React.useEffect(() => {
            if (autoFocus) {
                const t = setTimeout(() => focusAt(0), 0);
                return () => clearTimeout(t);
            }
        }, [autoFocus, focusAt]);

        return (
            <OTPContext.Provider value={ctx}>
                <div
                    ref={ref}
                    data-slot="input-otp"
                    className={cn(
                        'flex items-center gap-2 has-[:disabled]:opacity-50',
                        containerClassName,
                    )}
                    {...props}
                >
                    {name ? (
                        <input type="hidden" name={name} value={value} id={id} />
                    ) : null}
                    {/* Hidden inputs per slot for keyboard handling */}
                    {Array.from({ length: maxLength }, (_, i) => (
                        <input
                            key={i}
                            ref={(el) => {
                                inputsRef.current[i] = el;
                            }}
                            aria-label={`Digit ${i + 1}`}
                            className="sr-only"
                            tabIndex={-1}
                            disabled={disabled}
                            value={value[i] ?? ''}
                            inputMode="numeric"
                            autoComplete={i === 0 ? 'one-time-code' : 'off'}
                            onFocus={() => setFocusedIndex(i)}
                            onChange={(e) => {
                                const raw = e.target.value;
                                const char = raw.slice(-1);
                                if (!char) {
                                    const next =
                                        value.slice(0, i) + value.slice(i + 1);
                                    setValue(next);
                                    focusAt(Math.max(0, i - 1));
                                    return;
                                }
                                if (charRe && !charRe.test(char)) {
                                    return;
                                }
                                const next =
                                    value.slice(0, i) + char + value.slice(i + 1);
                                setValue(next);
                                if (i < maxLength - 1) {
                                    focusAt(i + 1);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Backspace' && !(value[i] ?? null)) {
                                    e.preventDefault();
                                    focusAt(Math.max(0, i - 1));
                                } else if (e.key === 'ArrowLeft') {
                                    e.preventDefault();
                                    focusAt(Math.max(0, i - 1));
                                } else if (e.key === 'ArrowRight') {
                                    e.preventDefault();
                                    focusAt(Math.min(maxLength - 1, i + 1));
                                } else if (e.key === 'Enter') {
                                    (e.target as HTMLInputElement).blur();
                                }
                            }}
                            onPaste={(e) => {
                                e.preventDefault();
                                const text = e.clipboardData.getData('text');
                                const cleaned = charRe
                                    ? text
                                          .split('')
                                          .filter((c) => charRe.test(c))
                                          .join('')
                                    : text;
                                setValue(cleaned.slice(0, maxLength));
                                focusAt(
                                    Math.min(
                                        maxLength - 1,
                                        cleaned.length,
                                    ),
                                );
                            }}
                        />
                    ))}
                    <div
                        className={cn('flex items-center', className)}
                        data-slot="input-otp-slots"
                        onClick={() => {
                            const firstEmpty = value.length < maxLength ? value.length : maxLength - 1;
                            focusAt(firstEmpty);
                        }}
                    >
                        {children}
                    </div>
                </div>
            </OTPContext.Provider>
        );
    },
);
InputOTP.displayName = 'InputOTP';

const InputOTPGroup = React.forwardRef<
    React.ElementRef<'div'>,
    React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center', className)} {...props} />
));
InputOTPGroup.displayName = 'InputOTPGroup';

const InputOTPSlot = React.forwardRef<
    HTMLButtonElement,
    React.ComponentPropsWithoutRef<'button'> & { index: number }
>(({ index, className, type = 'button', ...props }, ref) => {
    const ctx = React.useContext(OTPContext);
    const slot = ctx?.slots[index] ?? { char: null, hasFakeCaret: false, isActive: false };

    return (
        <button
            ref={ref}
            type={type}
            data-slot="input-otp-slot"
            data-active={slot.isActive}
            onClick={() => ctx?.setFocusedIndex(index)}
            className={cn(
                'relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md',
                slot.isActive && 'z-10 ring-1 ring-ring',
                className,
            )}
            {...props}
        >
            {slot.char}
            {slot.hasFakeCaret && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
                </div>
            )}
        </button>
    );
});
InputOTPSlot.displayName = 'InputOTPSlot';

const InputOTPSeparator = React.forwardRef<
    React.ElementRef<'div'>,
    React.ComponentPropsWithoutRef<'div'>
>(({ ...props }, ref) => (
    <div ref={ref} role="separator" {...props}>
        <Minus />
    </div>
));
InputOTPSeparator.displayName = 'InputOTPSeparator';

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
