import { Head, Link, usePage } from '@inertiajs/react';
import { Printer, Undo2 } from 'lucide-react';
import { index } from '@/actions/App/Http/Controllers/SaleController';
import { create as createReturn } from '@/actions/App/Http/Controllers/SaleReturnController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatIDR, formatQty } from '@/lib/format';
import { paymentMethodLabel, saleStatusLabel } from '@/lib/sale';
import { dashboard } from '@/routes';
import type { Sale } from '@/types';

type Business = {
    name: string;
    address: string | null;
    phone: string | null;
    receipt_header: string | null;
    receipt_footer: string | null;
} | null;

function formatDateTime(value: string | null): string {
    if (!value) {
        return '–';
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function SaleActions({ sale }: { sale: Sale }) {
    const { auth } = usePage().props;
    const canRefund =
        auth.permissions.includes('sales.refund') &&
        (sale.status === 'completed' || sale.status === 'partial_refund');

    return (
        <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="size-4" />
                Cetak Struk
            </Button>
            {canRefund && (
                <Button size="sm" asChild>
                    <Link href={createReturn(sale.id)}>
                        <Undo2 className="size-4" />
                        Buat Retur
                    </Link>
                </Button>
            )}
        </div>
    );
}

export default function SaleShow({
    sale,
    business,
}: {
    sale: Sale;
    business: Business;
}) {
    const items = sale.items ?? [];
    const payments = sale.payments ?? [];
    const returns = sale.returns ?? [];
    const itemDiscount = items.reduce((sum, item) => sum + item.discount, 0);

    return (
        <>
            <Head title={sale.number} />

            <div className="grid gap-4 print:hidden">
                <Card>
                    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="text-lg">
                                    {sale.number}
                                </CardTitle>
                                <Badge
                                    variant={
                                        sale.status === 'completed'
                                            ? 'default'
                                            : sale.status === 'cancelled'
                                              ? 'destructive'
                                              : 'secondary'
                                    }
                                >
                                    {saleStatusLabel[sale.status] ??
                                        sale.status}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {formatDateTime(sale.completed_at)} &middot;{' '}
                                {sale.store?.name ?? '–'} &middot; Kasir{' '}
                                {sale.cashier?.name ?? '–'} &middot; Pelanggan{' '}
                                {sale.customer?.name ?? 'Umum'}
                            </p>
                        </div>
                        <SaleActions sale={sale} />
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-y text-left text-muted-foreground">
                                        <th className="px-4 py-2.5 font-medium">
                                            Item
                                        </th>
                                        <th className="px-4 py-2.5 font-medium">
                                            Harga
                                        </th>
                                        <th className="px-4 py-2.5 font-medium">
                                            Qty
                                        </th>
                                        <th className="px-4 py-2.5 font-medium">
                                            Diskon
                                        </th>
                                        <th className="px-4 py-2.5 text-right font-medium">
                                            Subtotal
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="border-b last:border-0"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-medium">
                                                    {item.product?.name ?? '–'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.variant
                                                        ? `${item.variant.name} · `
                                                        : ''}
                                                    {item.product?.sku ?? ''}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 tabular-nums">
                                                {formatIDR(item.unit_price)}
                                            </td>
                                            <td className="px-4 py-3 tabular-nums">
                                                {formatQty(item.qty)}
                                            </td>
                                            <td className="px-4 py-3 tabular-nums">
                                                {formatIDR(item.discount)}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                {formatIDR(item.subtotal)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-medium">
                                Ringkasan Bayar
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-1 text-sm tabular-nums">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Subtotal</span>
                                <span>{formatIDR(sale.subtotal)}</span>
                            </div>
                            {itemDiscount > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Diskon item</span>
                                    <span>−{formatIDR(itemDiscount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-muted-foreground">
                                <span>Diskon belanja</span>
                                <span>−{formatIDR(sale.discount_total)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Pajak</span>
                                <span>+{formatIDR(sale.tax_total)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 text-base font-semibold">
                                <span>Total</span>
                                <span>{formatIDR(sale.grand_total)}</span>
                            </div>
                            {payments.map((payment) => (
                                <div
                                    key={payment.id}
                                    className="flex justify-between text-muted-foreground"
                                >
                                    <span>
                                        {paymentMethodLabel[payment.method] ??
                                            payment.method}
                                    </span>
                                    <span>{formatIDR(payment.amount)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between font-medium">
                                <span>Kembali</span>
                                <span>{formatIDR(sale.change_amount)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-medium">
                                Retur
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {returns.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Belum ada retur untuk transaksi ini.
                                </p>
                            ) : (
                                <ul className="grid gap-2 text-sm">
                                    {returns.map((ret) => (
                                        <li
                                            key={ret.id}
                                            className="flex items-center justify-between rounded-lg border px-3 py-2"
                                        >
                                            <span className="font-medium">
                                                {ret.number}
                                            </span>
                                            <span className="text-muted-foreground tabular-nums">
                                                {formatIDR(ret.total_refund)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="mx-auto hidden w-full max-w-xs print:block">
                <div className="text-center">
                    <p className="font-bold">{business?.name ?? 'NEXPOS'}</p>
                    {business?.address && (
                        <p className="text-xs">{business.address}</p>
                    )}
                    {business?.phone && (
                        <p className="text-xs">{business.phone}</p>
                    )}
                    {business?.receipt_header && (
                        <p className="mt-1 text-xs">
                            {business.receipt_header}
                        </p>
                    )}
                </div>
                <hr className="my-2 border-dashed" />
                <div className="text-xs">
                    <div className="flex justify-between">
                        <span>No</span>
                        <span>{sale.number}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Tanggal</span>
                        <span>{formatDateTime(sale.completed_at)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Kasir</span>
                        <span>{sale.cashier?.name ?? '–'}</span>
                    </div>
                </div>
                <hr className="my-2 border-dashed" />
                <ul className="grid gap-1 text-xs">
                    {items.map((item) => (
                        <li key={item.id}>
                            <p>
                                {item.product?.name}
                                {item.variant ? ` (${item.variant.name})` : ''}
                            </p>
                            <div className="flex justify-between tabular-nums">
                                <span>
                                    {formatQty(item.qty)} x{' '}
                                    {formatIDR(item.unit_price)}
                                </span>
                                <span>{formatIDR(item.subtotal)}</span>
                            </div>
                        </li>
                    ))}
                </ul>
                <hr className="my-2 border-dashed" />
                <div className="grid gap-0.5 text-xs tabular-nums">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatIDR(sale.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Diskon</span>
                        <span>−{formatIDR(sale.discount_total)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Pajak</span>
                        <span>+{formatIDR(sale.tax_total)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>{formatIDR(sale.grand_total)}</span>
                    </div>
                    {payments.map((payment) => (
                        <div key={payment.id} className="flex justify-between">
                            <span>
                                {paymentMethodLabel[payment.method] ??
                                    payment.method}
                            </span>
                            <span>{formatIDR(payment.amount)}</span>
                        </div>
                    ))}
                    <div className="flex justify-between">
                        <span>Kembali</span>
                        <span>{formatIDR(sale.change_amount)}</span>
                    </div>
                </div>
                <hr className="my-2 border-dashed" />
                <p className="text-center text-xs">
                    {business?.receipt_footer ??
                        'Terima kasih telah berbelanja'}
                </p>
            </div>
        </>
    );
}

SaleShow.layout = {
    title: 'Detail Transaksi',
    description: 'Rincian transaksi, pembayaran, dan struk.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Riwayat Penjualan',
            href: index(),
        },
        {
            title: 'Detail',
        },
    ],
};
