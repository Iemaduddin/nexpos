import * as React from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function formatRupiahDisplay(value: string | number | null | undefined): string {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (digits === '') {
        return '';
    }
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(
        Number(digits),
    );
}

export function parseRupiahInput(value: string | number | null | undefined): string {
    return String(value ?? '').replace(/\D/g, '');
}

type CurrencyInputProps = Omit<
    React.ComponentProps<'input'>,
    'value' | 'defaultValue' | 'type' | 'inputMode'
> & {
    /** Nilai mentah terkontrol (hanya digit). */
    value?: string | number;
    /** Nilai awal tak-terkontrol (hanya digit). */
    defaultValue?: string | number;
    /** Dipanggil dengan nilai mentah (hanya digit, '' bila kosong). */
    onValueChange?: (raw: string) => void;
    /** Bila diisi, nilai mentah dikirim lewat hidden input (aman untuk form native). */
    name?: string;
    /** Kelas untuk pembungkus (prefix Rp + input). */
    wrapperClassName?: string;
};

/**
 * Input rupiah: pengguna mengetik digit biasa, tampil otomatis
 * terformat Indonesia (10689000 -> "10.689.000") dengan prefix Rp.
 * Nilai yang dikirim selalu digit mentah (tanpa titik).
 */
function CurrencyInput({
    value: valueProp,
    defaultValue,
    onValueChange,
    onChange,
    name,
    className,
    wrapperClassName,
    ...props
}: CurrencyInputProps) {
    const [inner, setInner] = React.useState(() =>
        parseRupiahInput(defaultValue),
    );
    const controlled = valueProp !== undefined;
    const raw = controlled ? parseRupiahInput(valueProp) : inner;
    const display = formatRupiahDisplay(raw);

    return (
        <span
            className={cn(
                'relative inline-flex w-full items-center',
                wrapperClassName,
            )}
        >
            {name ? <input type="hidden" name={name} value={raw} /> : null}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3 text-sm text-muted-foreground"
            >
                Rp
            </span>
            <Input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={display}
                onChange={(e) => {
                    onChange?.(e);
                    const next = parseRupiahInput(e.target.value);
                    if (!controlled) {
                        setInner(next);
                    }
                    onValueChange?.(next);
                }}
                placeholder="0"
                className={cn('pl-9 tabular-nums', className)}
                {...props}
            />
        </span>
    );
}

export { CurrencyInput };
