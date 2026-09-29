import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
import {
    CalendarRange,
    Download,
    FileSpreadsheet,
    FileText,
    TrendingDown,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import {
    exportCashFlow,
    exportCashFlowPdf,
    exportCogs,
    exportCogsPdf,
    exportCsv,
    exportHarianPdf,
    index,
} from '@/actions/App/Http/Controllers/ReportController';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import ChartTooltip from '@/components/chart-tooltip';
import EmptyState from '@/components/empty-state';
import StatCard from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { compactIDR, nivoTheme, shortLabel } from '@/lib/chart';
import { formatIDR } from '@/lib/format';
import { confidenceLabel, segmentLabel } from '@/lib/ml';
import { dashboard } from '@/routes';
import type {
    AffinityPair,
    CashFlow,
    CategoryRevenue,
    CogsDailyRow,
    CogsProductRow,
    CogsSummary,
    DailyRow,
    ForecastDigest,
    Overview,
    TopProduct,
} from '@/types';

type ExportReport = 'harian' | 'hpp' | 'kas';
type ExportFormat = 'csv' | 'pdf';

const EXPORT_REPORTS: { value: ExportReport; title: string; hint: string }[] = [
    {
        value: 'harian',
        title: 'Laporan Harian',
        hint: 'Omzet, refund, HPP, dan laba per tanggal.',
    },
    {
        value: 'hpp',
        title: 'HPP per Produk',
        hint: 'Nilai pokok dan marjin tiap produk.',
    },
    {
        value: 'kas',
        title: 'Arus Kas',
        hint: 'Saldo, kas masuk, dan kas keluar.',
    },
];

function ExportDialog({ period }: { period: string }) {
    const [open, setOpen] = useState(false);
    const [report, setReport] = useState<ExportReport>('harian');
    const [format, setFormat] = useState<ExportFormat>('pdf');

    const targets: Record<ExportReport, Record<ExportFormat, string>> = {
        harian: {
            csv: exportCsv.url({ query: { period } }),
            pdf: exportHarianPdf.url({ query: { period } }),
        },
        hpp: {
            csv: exportCogs.url({ query: { period } }),
            pdf: exportCogsPdf.url({ query: { period } }),
        },
        kas: {
            csv: exportCashFlow.url({ query: { period } }),
            pdf: exportCashFlowPdf.url({ query: { period } }),
        },
    };

    function download() {
        const link = document.createElement('a');
        link.href = targets[report][format];
        link.download = '';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Download className="size-4" />
                    Export
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Export Laporan</DialogTitle>
                    <DialogDescription>
                        Pilih isi laporan dan format berkasnya.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                        Isi laporan
                    </p>
                    {EXPORT_REPORTS.map((item) => {
                        const active = report === item.value;
                        return (
                            <button
                                key={item.value}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setReport(item.value)}
                                className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${
                                    active
                                        ? 'border-primary bg-primary/5'
                                        : 'hover:bg-muted/50'
                                }`}
                            >
                                <span>
                                    <span className="block text-sm font-medium">
                                        {item.title}
                                    </span>
                                    <span className="block text-xs text-muted-foreground">
                                        {item.hint}
                                    </span>
                                </span>
                                <span
                                    aria-hidden
                                    className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                                        active
                                            ? 'border-primary'
                                            : 'border-muted-foreground/40'
                                    }`}
                                >
                                    {active && (
                                        <span className="size-2 rounded-full bg-primary" />
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="grid gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                        Format berkas
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            aria-pressed={format === 'pdf'}
                            onClick={() => setFormat('pdf')}
                            className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors ${
                                format === 'pdf'
                                    ? 'border-primary bg-primary/5'
                                    : 'hover:bg-muted/50'
                            }`}
                        >
                            <FileText className="size-5" />
                            <span className="text-sm font-medium">PDF</span>
                            <span className="text-xs text-muted-foreground">
                                Siap cetak & arsip
                            </span>
                        </button>
                        <button
                            type="button"
                            aria-pressed={format === 'csv'}
                            onClick={() => setFormat('csv')}
                            className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors ${
                                format === 'csv'
                                    ? 'border-primary bg-primary/5'
                                    : 'hover:bg-muted/50'
                            }`}
                        >
                            <FileSpreadsheet className="size-5" />
                            <span className="text-sm font-medium">CSV</span>
                            <span className="text-xs text-muted-foreground">
                                Diolah di spreadsheet
                            </span>
                        </button>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Batal</Button>
                    </DialogClose>
                    <Button onClick={download}>
                        <Download className="size-4" />
                        Unduh {format.toUpperCase()}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function ReportIndex({
    period,
    periods,
    rangeLabel,
    overview,
    daily,
    topProducts,
    inventoryValue,
    forecasts,
    affinities,
    segments,
    categoryRevenue,
    cogs,
    cogsByProduct,
    cogsDaily,
    cashFlow,
}: {
    period: string;
    periods: Record<string, string>;
    rangeLabel: string;
    overview: Overview;
    daily: DailyRow[];
    topProducts: TopProduct[];
    inventoryValue: number;
    forecasts: ForecastDigest[];
    affinities: AffinityPair[];
    segments: Record<string, number>;
    categoryRevenue: CategoryRevenue[];
    cogs: CogsSummary;
    cogsByProduct: CogsProductRow[];
    cogsDaily: CogsDailyRow[];
    cashFlow: CashFlow;
}) {
    const stats = [
        {
            title: 'Pendapatan Kotor',
            value: formatIDR(overview.revenue),
            sub: `${overview.transactions} transaksi`,
            icon: TrendingUp,
        },
        {
            title: 'Refund',
            value: formatIDR(overview.refunds),
            sub: 'pengembalian ke pelanggan',
            icon: TrendingDown,
        },
        {
            title: 'Pendapatan Bersih',
            value: formatIDR(overview.net_revenue),
            sub: `rata-rata ${formatIDR(overview.avg_transaction)}`,
            icon: TrendingUp,
        },
        {
            title: 'Laba Kotor',
            value: formatIDR(overview.profit),
            sub: `${overview.items_sold} item terjual`,
            icon: TrendingUp,
        },
    ];

    const cogsStats = [
        {
            title: 'HPP Bersih',
            value: formatIDR(cogs.net_cogs),
            sub: `kotor ${formatIDR(cogs.gross_cogs)}`,
            icon: TrendingDown,
        },
        {
            title: 'Marjin Kotor',
            value: formatIDR(cogs.gross_margin),
            sub:
                cogs.margin_pct === null
                    ? 'belum ada pendapatan bersih'
                    : `${cogs.margin_pct}% dari pendapatan bersih`,
            icon: TrendingUp,
        },
        {
            title: 'HPP Diretur',
            value: formatIDR(cogs.returned_cogs),
            sub: 'nilai pokok barang retur',
            icon: TrendingDown,
        },
        {
            title: 'Saldo Kas Akhir',
            value: formatIDR(cashFlow.closing_balance),
            sub: `arus bersih ${formatIDR(cashFlow.net_flow)}`,
            icon: Wallet,
        },
    ];

    const cogsByDate = Object.fromEntries(
        cogsDaily.map((row) => [row.date, row]),
    );
    const topByName = new Map(topProducts.map((item) => [item.name, item]));

    // Tabel harian hanya menampilkan hari beraktivitas agar tidak
    // menjadi deretan baris nol saat datanya sedikit.
    const activeDaily = daily.filter(
        (row) => row.transactions > 0 || row.refunds > 0,
    );
    const activeCashDaily = cashFlow.daily.filter(
        (row) => row.in > 0 || row.out > 0,
    );

    return (
        <>
            <Head title="Laporan Penjualan" />

            <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CalendarRange className="size-4" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">Periode laporan</p>
                        <p className="text-xs text-muted-foreground">
                            {rangeLabel}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(periods).map(([value, label]) => (
                        <Button
                            key={value}
                            size="sm"
                            variant={period === value ? 'default' : 'outline'}
                            asChild
                        >
                            <Link
                                href={index.url({ query: { period: value } })}
                            >
                                {label}
                            </Link>
                        </Button>
                    ))}
                    <ExportDialog period={period} />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                    <div key={stat.title} className="min-w-0">
                        <StatCard {...stat} />
                    </div>
                ))}
            </div>

            <div>
                <Card className="min-w-0 overflow-hidden py-0 xl:col-span-2">
                    <CardHeader className="px-5 py-5">
                        <CardTitle className="text-base font-medium">
                            Tren Pendapatan & Laba · {rangeLabel}
                        </CardTitle>
                    </CardHeader>
                    {daily.some((row) => row.transactions > 0) ? (
                        <CardContent className="px-3 pb-5 sm:px-5">
                            <div className="h-72 w-full">
                                <ResponsiveLine
                                    data={[
                                        {
                                            id: 'Pendapatan',
                                            data: daily.map((row) => ({
                                                x: row.label,
                                                y: row.revenue,
                                            })),
                                        },
                                        {
                                            id: 'Laba',
                                            data: daily.map((row) => ({
                                                x: row.label,
                                                y: row.profit,
                                            })),
                                        },
                                        {
                                            id: 'Refund',
                                            data: daily.map((row) => ({
                                                x: row.label,
                                                y: row.refunds,
                                            })),
                                        },
                                    ]}
                                    margin={{
                                        top: 12,
                                        right: 16,
                                        bottom: 42,
                                        left: 72,
                                    }}
                                    xScale={{ type: 'point' }}
                                    yScale={{
                                        type: 'linear',
                                        min: 'auto',
                                        max: 'auto',
                                        stacked: false,
                                        reverse: false,
                                    }}
                                    curve="monotoneX"
                                    colors={[
                                        'var(--chart-1)',
                                        'var(--chart-2)',
                                        'var(--destructive)',
                                    ]}
                                    lineWidth={2.5}
                                    pointSize={8}
                                    pointColor={{ from: 'seriesColor' }}
                                    pointBorderWidth={2}
                                    pointBorderColor="var(--card)"
                                    enableArea
                                    areaOpacity={0.08}
                                    enableGridX={false}
                                    axisTop={null}
                                    axisRight={null}
                                    axisBottom={{
                                        tickSize: 0,
                                        tickPadding: 10,
                                    }}
                                    axisLeft={{
                                        tickSize: 0,
                                        tickPadding: 8,
                                        format: compactIDR,
                                    }}
                                    enableSlices="x"
                                    sliceTooltip={({ slice }) => (
                                        <ChartTooltip
                                            title={String(
                                                slice.points[0]?.data
                                                    .xFormatted ?? '',
                                            )}
                                            rows={slice.points.map((point) => ({
                                                label: String(point.seriesId),
                                                value: Number(point.data.y),
                                                money: true,
                                                color: point.seriesColor,
                                            }))}
                                        />
                                    )}
                                    legends={[
                                        {
                                            anchor: 'bottom',
                                            direction: 'row',
                                            translateY: 40,
                                            itemsSpacing: 18,
                                            itemWidth: 90,
                                            itemHeight: 18,
                                            symbolSize: 10,
                                        },
                                    ]}
                                    theme={nivoTheme}
                                />
                            </div>
                        </CardContent>
                    ) : (
                        <CardContent>
                            <EmptyState
                                className="py-6"
                                icon={TrendingUp}
                                title="Belum ada tren"
                                description="Chart akan muncul setelah ada transaksi."
                            />
                        </CardContent>
                    )}
                </Card>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cogsStats.map((stat) => (
                    <div key={stat.title} className="min-w-0">
                        <StatCard {...stat} />
                    </div>
                ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Card className="overflow-hidden py-0">
                    <CardHeader className="px-5 py-5">
                        <CardTitle className="text-base font-medium">
                            HPP per Produk · {rangeLabel}
                        </CardTitle>
                    </CardHeader>
                    {cogsByProduct.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-y text-left text-muted-foreground">
                                        <th className="px-4 py-2.5 font-medium">
                                            Produk
                                        </th>
                                        <th className="px-4 py-2.5 text-right font-medium">
                                            HPP
                                        </th>
                                        <th className="px-4 py-2.5 text-right font-medium">
                                            Marjin
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cogsByProduct.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="border-b last:border-0"
                                        >
                                            <td className="px-4 py-2.5">
                                                <p className="font-medium">
                                                    {row.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {row.qty} terjual · refund{' '}
                                                    {formatIDR(row.refunds)}
                                                </p>
                                            </td>
                                            <td className="px-4 py-2.5 text-right tabular-nums">
                                                {formatIDR(row.cogs)}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                                                {formatIDR(row.margin)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <CardContent className="pt-0">
                            <EmptyState
                                className="py-6"
                                icon={TrendingUp}
                                title="Belum ada HPP"
                                description={`Tidak ada penjualan pada periode ${rangeLabel.toLowerCase()}.`}
                            />
                        </CardContent>
                    )}
                </Card>

                <Card className="overflow-hidden py-0">
                    <CardHeader className="px-5 py-5">
                        <CardTitle className="text-base font-medium">
                            Arus Kas · {rangeLabel}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-5 pt-0">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                                Saldo awal
                            </span>
                            <span className="font-medium tabular-nums">
                                {formatIDR(cashFlow.opening_balance)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                                Kas masuk penjualan
                            </span>
                            <span className="font-medium text-emerald-600 tabular-nums">
                                +{formatIDR(cashFlow.cash_in)}
                            </span>
                        </div>
                        {cashFlow.cash_in_by_method.map((row) => (
                            <div
                                key={row.method}
                                className="flex justify-between pl-4 text-xs text-muted-foreground"
                            >
                                <span>{row.method}</span>
                                <span className="tabular-nums">
                                    {formatIDR(row.amount)}
                                </span>
                            </div>
                        ))}
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                                Bayar pemasok
                            </span>
                            <span className="font-medium text-destructive tabular-nums">
                                -{formatIDR(cashFlow.cash_out_purchases)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                                Refund pelanggan
                            </span>
                            <span className="font-medium text-destructive tabular-nums">
                                -{formatIDR(cashFlow.cash_out_refunds)}
                            </span>
                        </div>
                        <div className="flex justify-between border-t pt-3 text-sm">
                            <span className="font-medium">Saldo akhir</span>
                            <span className="font-semibold tabular-nums">
                                {formatIDR(cashFlow.closing_balance)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div>
                <Card className="min-w-0 overflow-hidden py-0">
                    <CardHeader className="px-5 py-5">
                        <CardTitle className="text-base font-medium">
                            Arus Kas Harian · {rangeLabel}
                        </CardTitle>
                        {activeCashDaily.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {activeCashDaily.length} hari beraktivitas
                            </p>
                        )}
                    </CardHeader>
                    {activeCashDaily.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-y text-left text-muted-foreground">
                                        <th className="px-4 py-2.5 font-medium">
                                            Tanggal
                                        </th>
                                        <th className="px-4 py-2.5 text-right font-medium">
                                            Masuk
                                        </th>
                                        <th className="px-4 py-2.5 text-right font-medium">
                                            Keluar
                                        </th>
                                        <th className="px-4 py-2.5 text-right font-medium">
                                            Bersih
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeCashDaily.map((row) => (
                                        <tr
                                            key={row.date}
                                            className="border-b last:border-0"
                                        >
                                            <td className="px-4 py-2.5 font-medium">
                                                {row.label}
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-emerald-600 tabular-nums">
                                                {formatIDR(row.in)}
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-destructive tabular-nums">
                                                {formatIDR(row.out)}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                                                {formatIDR(row.net)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <CardContent>
                            <EmptyState
                                className="py-6"
                                icon={Wallet}
                                title="Belum ada arus kas"
                                description="Belum ada pembayaran atau refund pada periode ini."
                            />
                        </CardContent>
                    )}
                </Card>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Card className="min-w-0 overflow-hidden py-0">
                    <CardHeader className="px-5 py-5">
                        <CardTitle className="text-base font-medium">
                            Volume Produk Terlaris
                        </CardTitle>
                    </CardHeader>
                    {topProducts.length > 0 ? (
                        <CardContent className="px-3 pb-5 sm:px-5">
                            <div className="h-72 w-full">
                                <ResponsiveBar
                                    data={topProducts.map((product) => ({
                                        produk: product.name,
                                        unit: product.qty,
                                    }))}
                                    keys={['unit']}
                                    indexBy="produk"
                                    margin={{
                                        top: 8,
                                        right: 12,
                                        bottom: 36,
                                        left: 12,
                                    }}
                                    padding={0.35}
                                    valueScale={{ type: 'linear' }}
                                    indexScale={{ type: 'band', round: true }}
                                    colors={['var(--chart-3)']}
                                    borderRadius={4}
                                    enableLabel={false}
                                    enableGridX={false}
                                    axisTop={null}
                                    axisRight={null}
                                    axisLeft={null}
                                    axisBottom={{
                                        tickSize: 0,
                                        tickPadding: 8,
                                        tickRotation: -28,
                                        format: shortLabel,
                                    }}
                                    tooltip={({ indexValue, value, color }) => {
                                        const item = topByName.get(
                                            String(indexValue),
                                        );
                                        return (
                                            <ChartTooltip
                                                title={String(indexValue)}
                                                rows={[
                                                    {
                                                        label: 'Terjual',
                                                        value: Number(value),
                                                        color: String(color),
                                                    },
                                                    ...(item
                                                        ? [
                                                              {
                                                                  label: 'Pendapatan',
                                                                  value: item.revenue,
                                                                  money: true as const,
                                                              },
                                                          ]
                                                        : []),
                                                ]}
                                            />
                                        );
                                    }}
                                    theme={nivoTheme}
                                />
                            </div>
                        </CardContent>
                    ) : (
                        <CardContent>
                            <EmptyState
                                className="py-6"
                                icon={TrendingUp}
                                title="Belum ada data"
                                description="Chart akan muncul setelah ada penjualan."
                            />
                        </CardContent>
                    )}
                </Card>
                <Card className="min-w-0 overflow-hidden py-0">
                    <CardHeader className="px-5 py-5">
                        <CardTitle className="text-base font-medium">
                            Kontribusi Pendapatan per Kategori
                        </CardTitle>
                    </CardHeader>
                    {categoryRevenue.length > 0 ? (
                        <CardContent className="px-3 pb-5 sm:px-5">
                            <div className="h-64 w-full">
                                <ResponsiveBar
                                    data={categoryRevenue}
                                    keys={['revenue']}
                                    indexBy="name"
                                    margin={{
                                        top: 8,
                                        right: 16,
                                        bottom: 48,
                                        left: 72,
                                    }}
                                    padding={0.35}
                                    valueScale={{ type: 'linear' }}
                                    indexScale={{ type: 'band', round: true }}
                                    colors={['var(--chart-4)']}
                                    borderRadius={4}
                                    enableLabel={false}
                                    enableGridX={false}
                                    axisTop={null}
                                    axisRight={null}
                                    axisLeft={{
                                        tickSize: 0,
                                        tickPadding: 8,
                                        format: compactIDR,
                                    }}
                                    axisBottom={{
                                        tickSize: 0,
                                        tickPadding: 8,
                                        tickRotation: -25,
                                        format: shortLabel,
                                    }}
                                    tooltip={({ indexValue, value, color }) => (
                                        <ChartTooltip
                                            title={String(indexValue)}
                                            rows={[
                                                {
                                                    label: 'Pendapatan',
                                                    value: Number(value),
                                                    money: true,
                                                    color: String(color),
                                                },
                                            ]}
                                        />
                                    )}
                                    theme={nivoTheme}
                                />
                            </div>
                        </CardContent>
                    ) : (
                        <CardContent>
                            <EmptyState
                                className="py-6"
                                icon={TrendingUp}
                                title="Belum ada kategori"
                                description="Chart akan muncul setelah ada penjualan."
                            />
                        </CardContent>
                    )}
                </Card>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Card className="overflow-hidden py-0">
                    <CardHeader className="px-5 py-5">
                        <CardTitle className="text-base font-medium">
                            Tren Harian · {rangeLabel}
                        </CardTitle>
                        {activeDaily.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {activeDaily.length} hari beraktivitas
                            </p>
                        )}
                    </CardHeader>
                    {activeDaily.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-y text-left text-muted-foreground">
                                        <th className="px-4 py-2.5 font-medium">
                                            Tanggal
                                        </th>
                                        <th className="px-4 py-2.5 font-medium">
                                            Transaksi
                                        </th>
                                        <th className="px-4 py-2.5 font-medium">
                                            Pendapatan
                                        </th>
                                        <th className="px-4 py-2.5 font-medium">
                                            HPP
                                        </th>
                                        <th className="px-4 py-2.5 text-right font-medium">
                                            Laba
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeDaily.map((row) => (
                                        <tr
                                            key={row.date}
                                            className="border-b last:border-0"
                                        >
                                            <td className="px-4 py-2.5 font-medium">
                                                {row.label}
                                            </td>
                                            <td className="px-4 py-2.5 tabular-nums">
                                                {row.transactions}
                                            </td>
                                            <td className="px-4 py-2.5 tabular-nums">
                                                {formatIDR(row.revenue)}
                                            </td>
                                            <td className="px-4 py-2.5 tabular-nums">
                                                {formatIDR(
                                                    cogsByDate[row.date]
                                                        ?.cogs ?? 0,
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-right tabular-nums">
                                                {formatIDR(row.profit)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <CardContent className="pt-0">
                            <EmptyState
                                className="py-6"
                                icon={TrendingUp}
                                title="Belum ada transaksi"
                                description={`Tidak ada penjualan pada periode ${rangeLabel.toLowerCase()}.`}
                            />
                        </CardContent>
                    )}
                </Card>

                <div className="grid content-start gap-4">
                    <Card className="overflow-hidden py-0">
                        <CardHeader className="px-5 py-5">
                            <CardTitle className="text-base font-medium">
                                Produk Terlaris
                            </CardTitle>
                        </CardHeader>
                        {topProducts.length > 0 ? (
                            <CardContent className="p-0">
                                <table className="w-full text-sm">
                                    <tbody>
                                        {topProducts.map((product, i) => (
                                            <tr
                                                key={product.id}
                                                className="border-t first:border-0"
                                            >
                                                <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                                                    {i + 1}
                                                </td>
                                                <td className="px-2 py-2.5">
                                                    <p className="font-medium">
                                                        {product.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {product.qty} terjual
                                                    </p>
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                                                    {formatIDR(product.revenue)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        ) : (
                            <CardContent className="pt-0">
                                <EmptyState
                                    className="py-6"
                                    icon={TrendingUp}
                                    title="Belum ada data"
                                    description="Produk terlaris akan muncul setelah ada penjualan."
                                />
                            </CardContent>
                        )}
                    </Card>
                    <Card className="overflow-hidden py-0">
                        <CardHeader className="px-5 py-5">
                            <CardTitle className="text-base font-medium">
                                Nilai Inventaris
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                            <p className="text-3xl font-semibold tracking-tight tabular-nums">
                                {formatIDR(inventoryValue)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Total nilai stok berdasarkan harga beli
                                terakhir.
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="overflow-hidden py-0">
                        <CardHeader className="px-5 py-5">
                            <CardTitle className="text-base font-medium">
                                Segmentasi Pelanggan
                            </CardTitle>
                        </CardHeader>
                        {Object.keys(segments).length > 0 ? (
                            <CardContent className="p-0">
                                <table className="w-full text-sm">
                                    <tbody>
                                        {Object.entries(segments).map(
                                            ([segment, count]) => (
                                                <tr
                                                    key={segment}
                                                    className="border-t first:border-0"
                                                >
                                                    <td className="px-4 py-2.5 font-medium">
                                                        {segmentLabel[
                                                            segment
                                                        ] ?? segment}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right tabular-nums">
                                                        {count} pelanggan
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        ) : (
                            <CardContent className="pt-0">
                                <EmptyState
                                    className="py-6"
                                    icon={TrendingUp}
                                    title="Belum ada segmen"
                                    description="Belum ada segmentasi pelanggan. Jalankan customers:segment setelah ada riwayat transaksi pelanggan."
                                />
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <Card className="overflow-hidden py-0">
                    <CardHeader className="px-5 py-5">
                        <CardTitle className="text-base font-medium">
                            Proyeksi Permintaan · 7 hari ke depan
                        </CardTitle>
                    </CardHeader>
                    {forecasts.length > 0 ? (
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <tbody>
                                    {forecasts.map((forecast) => (
                                        <tr
                                            key={forecast.sku}
                                            className="border-t first:border-0"
                                        >
                                            <td className="px-4 py-2.5">
                                                <p className="font-medium">
                                                    {forecast.product}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Keyakinan{' '}
                                                    {confidenceLabel[
                                                        forecast.confidence
                                                    ] ?? forecast.confidence}
                                                </p>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                                                ±{forecast.qty} unit
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    ) : (
                        <CardContent className="pt-0">
                            <EmptyState
                                className="py-6"
                                icon={TrendingUp}
                                title="Belum ada proyeksi"
                                description="Belum ada hasil forecast. Jalankan forecast:generate untuk menghitung proyeksi dari riwayat penjualan."
                            />
                        </CardContent>
                    )}
                </Card>

                <Card className="overflow-hidden py-0">
                    <CardHeader className="px-5 py-5">
                        <CardTitle className="text-base font-medium">
                            Sering Dibeli Bersama
                        </CardTitle>
                    </CardHeader>
                    {affinities.length > 0 ? (
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <tbody>
                                    {affinities.map((pair, i) => (
                                        <tr
                                            key={`${pair.product}-${pair.with}-${i}`}
                                            className="border-t first:border-0"
                                        >
                                            <td className="px-4 py-2.5">
                                                <p className="font-medium">
                                                    {pair.product}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    + {pair.with}
                                                </p>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                                                {Math.round(
                                                    pair.confidence * 100,
                                                )}
                                                %
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    ) : (
                        <CardContent className="pt-0">
                            <EmptyState
                                className="py-6"
                                icon={TrendingUp}
                                title="Belum ada pola"
                                description="Belum ada hasil rekomendasi. Jalankan recommend:generate setelah tersedia transaksi dengan beberapa produk."
                            />
                        </CardContent>
                    )}
                </Card>
            </div>
        </>
    );
}

ReportIndex.layout = {
    title: 'Laporan Penjualan',
    description: 'Kinerja bisnis per periode dengan angka yang pasti.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Laporan',
        },
    ],
};
