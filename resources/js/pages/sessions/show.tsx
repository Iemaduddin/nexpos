import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { index } from '@/actions/App/Http/Controllers/CashSessionController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatIDR } from '@/lib/format';
import { dashboard } from '@/routes';
import type { CashSession, SessionBreakdown } from '@/types';

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

export default function SessionShow({
    session,
    breakdown,
}: {
    session: CashSession;
    breakdown: SessionBreakdown;
}) {
    const isClosed = session.status === 'closed';
    const difference = breakdown.difference ?? 0;

    return (
        <>
            <Head title={`Sesi Kas #${session.id}`} />

            <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Button size="sm" variant="outline" asChild>
                            <Link href={index()}>
                                <ArrowLeft className="size-4" />
                                Riwayat
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-lg font-semibold">
                                {session.store?.name ?? '–'}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Dibuka {session.opener?.name ?? '–'} ·{' '}
                                {formatDateTime(session.opened_at)}
                                {isClosed && (
                                    <>
                                        {' → ditutup '}
                                        {session.closer?.name ?? '–'} ·{' '}
                                        {formatDateTime(session.closed_at)}
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                    <Badge variant={isClosed ? 'secondary' : 'default'}>
                        {isClosed ? 'Ditutup' : 'Terbuka'}
                    </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-medium">
                                Rekonsiliasi Laci
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-1 text-sm tabular-nums">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Saldo awal</span>
                                <span>
                                    {formatIDR(breakdown.opening_balance)}
                                </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>
                                    Penjualan tunai ({breakdown.sales_count}{' '}
                                    transaksi)
                                </span>
                                <span className="text-emerald-600">
                                    +{formatIDR(breakdown.cash_sales)}
                                </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>
                                    Refund ({breakdown.returns_count} retur)
                                </span>
                                <span className="text-destructive">
                                    −{formatIDR(breakdown.refunds)}
                                </span>
                            </div>
                            <div className="flex justify-between border-t pt-2 font-medium">
                                <span>Ekspektasi sistem</span>
                                <span>{formatIDR(breakdown.expected)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Uang aktual
                                </span>
                                <span className="font-medium">
                                    {breakdown.actual === null
                                        ? 'Belum ditutup'
                                        : formatIDR(breakdown.actual)}
                                </span>
                            </div>
                            {isClosed && (
                                <div
                                    className={`flex justify-between border-t pt-2 font-semibold ${difference < 0 ? 'text-destructive' : ''}`}
                                >
                                    <span>
                                        Selisih{' '}
                                        {difference === 0
                                            ? '(cocok)'
                                            : difference > 0
                                              ? '(lebih)'
                                              : '(kurang)'}
                                    </span>
                                    <span>{formatIDR(difference)}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-medium">
                                Pembayaran per Metode
                            </CardTitle>
                        </CardHeader>
                        {breakdown.by_method.length > 0 ? (
                            <CardContent className="p-0">
                                <table className="w-full text-sm">
                                    <tbody>
                                        {breakdown.by_method.map((row) => (
                                            <tr
                                                key={row.method}
                                                className="border-t first:border-0"
                                            >
                                                <td className="px-4 py-2.5 font-medium">
                                                    {row.method}
                                                    <p className="text-xs font-normal text-muted-foreground">
                                                        {row.payments}{' '}
                                                        pembayaran
                                                    </p>
                                                </td>
                                                <td className="px-4 py-2.5 text-right tabular-nums">
                                                    {formatIDR(row.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        ) : (
                            <CardContent className="pt-0 text-sm text-muted-foreground">
                                Belum ada penjualan pada sesi ini.
                            </CardContent>
                        )}
                    </Card>
                </div>

                {breakdown.returns.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-medium">
                                Retur pada Sesi Ini
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <tbody>
                                    {breakdown.returns.map((ret) => (
                                        <tr
                                            key={ret.id}
                                            className="border-t first:border-0"
                                        >
                                            <td className="px-4 py-2.5 font-medium">
                                                {ret.number}
                                                <p className="text-xs font-normal text-muted-foreground">
                                                    {formatDateTime(
                                                        ret.created_at,
                                                    )}
                                                </p>
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-destructive tabular-nums">
                                                −{formatIDR(ret.total_refund)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

SessionShow.layout = {
    title: 'Rincian Sesi Kas',
    description: 'Rekonsiliasi laci per sesi kasir.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Sesi Kas',
            href: index(),
        },
        {
            title: 'Rincian',
        },
    ],
};
