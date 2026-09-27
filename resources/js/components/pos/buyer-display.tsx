import { CheckCircle2 } from 'lucide-react';
import * as React from 'react';
import { formatIDR, formatQty } from '@/lib/format';
import { paymentMethodLabel } from '@/lib/sale';

export const POS_LIVE_KEY = 'nexpos:pos:live:v1';

export type BuyerLine = {
    key: string;
    name: string;
    sub: string;
    qty: number;
    subtotal: number;
};

export type BuyerReceipt = {
    number: string;
    change_amount: number;
    customer: string | null;
    paid_total: number;
};

export type BuyerPayment = {
    method: string;
    amount: number;
};

export type PosLiveSnapshot = {
    v: 1;
    savedAt: number;
    storeName: string;
    customerName: string | null;
    lines: BuyerLine[];
    grand: number;
    paid: number;
    payments: BuyerPayment[];
    receipt: BuyerReceipt | null;
};

export function readLiveSnapshot(): PosLiveSnapshot | null {
    try {
        const raw = localStorage.getItem(POS_LIVE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as PosLiveSnapshot;
        return parsed && Array.isArray(parsed.lines) ? parsed : null;
    } catch {
        return null;
    }
}

export function BuyerClock() {
    const [now, setNow] = React.useState(() => new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const date = now.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    const time = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <span className="tabular-nums">
            {date}, {time}
        </span>
    );
}

type BuyerDisplayProps = {
    storeName: string;
    customerName: string | null;
    lines: BuyerLine[];
    grand: number;
    paid: number;
    payments: BuyerPayment[];
    receipt: BuyerReceipt | null;
    footer?: React.ReactNode;
};

export function BuyerDisplay({
    storeName,
    customerName,
    lines,
    grand,
    paid,
    payments,
    receipt,
    footer,
}: BuyerDisplayProps) {
    const remaining = Math.max(0, grand - paid);
    return (
        <>
            <div className="flex items-center gap-2 border-b px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
                <img
                    src="/logo.webp"
                    alt="NEXPOS"
                    className="size-8 shrink-0 rounded-lg object-cover sm:size-10"
                />
                <div className="min-w-0 leading-tight">
                    <p className="truncate text-base font-semibold sm:text-lg">
                        {storeName}
                    </p>
                    <p className="text-[10px] tracking-[0.2em] text-muted-foreground sm:text-[11px]">
                        AROBIDSH ID
                    </p>
                </div>
                <p className="ml-auto shrink-0 text-right text-xs text-muted-foreground sm:text-lg">
                    <BuyerClock />
                </p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6 lg:gap-6 lg:overflow-hidden">
                {lines.length > 0 ? (
                    <>
                        <ul className="grid content-start gap-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                            {lines.map((line) => (
                                <li
                                    key={line.key}
                                    className="flex items-baseline justify-between gap-4 border-b pb-3"
                                >
                                    <span className="min-w-0 truncate text-lg font-medium sm:text-xl">
                                        {line.name}
                                        {line.sub ? ` · ${line.sub}` : ''}{' '}
                                        <span className="text-muted-foreground tabular-nums">
                                            ×{formatQty(line.qty)}
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-lg tabular-nums sm:text-xl">
                                        {formatIDR(line.subtotal)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                                <div className="flex shrink-0 flex-col justify-center gap-2 rounded-2xl bg-muted/60 p-6 text-center sm:p-8">
                                    {customerName ? (
                                        <p className="text-lg font-medium">
                                            {customerName}
                                        </p>
                                    ) : null}
                                    <p className="text-lg text-muted-foreground">
                                        Total belanja
                                    </p>
                                    <p className="font-bold tabular-nums text-[clamp(2.75rem,10vw,4.5rem)]">
                                        {formatIDR(grand)}
                                    </p>
                                    {payments.length > 0 ? (
                                        <dl className="mx-auto mt-1 grid min-w-56 gap-0.5 text-sm tabular-nums">
                                            {payments.map((payment, i) => (
                                                <div
                                                    key={`${payment.method}-${i}`}
                                                    className="flex justify-between gap-6 text-muted-foreground"
                                                >
                                                    <dt>
                                                        {paymentMethodLabel[
                                                            payment.method
                                                        ] ?? payment.method}
                                                    </dt>
                                                    <dd>
                                                        {formatIDR(
                                                            payment.amount,
                                                        )}
                                                    </dd>
                                                </div>
                                            ))}
                                            <div className="flex justify-between gap-6 font-medium text-foreground">
                                                <dt>Dibayar</dt>
                                                <dd>{formatIDR(paid)}</dd>
                                            </div>
                                            {remaining > 0 ? (
                                                <div className="flex justify-between gap-6 font-semibold">
                                                    <dt>Kurang</dt>
                                                    <dd>
                                                        {formatIDR(remaining)}
                                                    </dd>
                                                </div>
                                            ) : null}
                                        </dl>
                                    ) : (
                                        <p className="mt-2 text-muted-foreground">
                                            Menunggu pembayaran...
                                        </p>
                                    )}
                                </div>
                    </>
                ) : receipt ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                        <span className="flex size-16 items-center justify-center rounded-full bg-green-500/15">
                            <CheckCircle2 className="size-8 text-green-600" />
                        </span>
                        <p className="text-2xl font-semibold">Terima kasih!</p>
                        <p className="text-muted-foreground tabular-nums">
                            {receipt.number}
                        </p>
                        {receipt.customer ? (
                            <p className="text-lg font-medium">
                                {receipt.customer}
                            </p>
                        ) : null}
                        <p className="mt-2 text-lg text-muted-foreground">
                            Kembalian
                        </p>
                        <p className="font-bold tabular-nums text-[clamp(3rem,12vw,4.5rem)]">
                            {formatIDR(receipt.change_amount)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                            Dibayar {formatIDR(receipt.paid_total)}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
                        <img
                            src="/logo.webp"
                            alt="NEXPOS"
                            className="size-16 rounded-2xl object-cover sm:size-20"
                        />
                        <p className="text-2xl font-semibold sm:text-3xl">
                            Selamat datang di {storeName}
                        </p>
                        <p className="text-muted-foreground">
                            Silakan tunggu, kasir akan melayani Anda.
                        </p>
                    </div>
                )}
            </div>
            {footer ? (
                <div className="flex justify-center border-t px-6 py-3">
                    {footer}
                </div>
            ) : null}
        </>
    );
}
