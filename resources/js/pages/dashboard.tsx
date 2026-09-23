import { Head, Link } from '@inertiajs/react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import {
    Banknote,
    Package,
    ReceiptText,
    TrendingUp,
    TriangleAlert,
    Trophy,
} from 'lucide-react';
import { show as showSale } from '@/actions/App/Http/Controllers/SaleController';
import AnomalyCard from '@/components/anomaly-card';
import BriefingCard from '@/components/briefing-card';
import EmptyState from '@/components/empty-state';
import StatCard from '@/components/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatIDR } from '@/lib/format';
import { paymentMethodLabel } from '@/lib/sale';
import { dashboard } from '@/routes';
import type {
    Anomaly,
    HourlySales,
    LowStockItem,
    Overview,
    PaymentSummary,
    Sale,
    TopProduct,
} from '@/types';

function formatTime(value: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export default function Dashboard({
    overview,
    topProducts,
    lowStock,
    hourlySales,
    paymentSummary,
    recentSales,
    briefing,
    anomalies,
}: {
    overview: Overview;
    topProducts: TopProduct[];
    lowStock: LowStockItem[];
    hourlySales: HourlySales[];
    paymentSummary: PaymentSummary[];
    recentSales: Sale[];
    briefing: string | null;
    anomalies: Anomaly[];
}) {
    const stats = [
        {
            title: 'Omzet Hari Ini',
            value: formatIDR(overview.revenue),
            sub: `${overview.transactions} transaksi`,
            icon: Banknote,
        },
        {
            title: 'Rata-rata Transaksi',
            value: formatIDR(overview.avg_transaction),
            sub: 'per transaksi hari ini',
            icon: ReceiptText,
        },
        {
            title: 'Laba Kotor Hari Ini',
            value: formatIDR(overview.profit),
            sub: `${overview.items_sold} item terjual`,
            icon: TrendingUp,
        },
        {
            title: 'Stok Menipis',
            value: lowStock.length.toString(),
            sub: 'produk di bawah batas',
            icon: TriangleAlert,
        },
    ];

    return (
        <>
            <Head title="Dashboard" />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                    <StatCard key={stat.title} {...stat} />
                ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-medium">
                            Produk Terlaris · 7 hari
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topProducts.length > 0 ? (
                            <div className="h-64 w-full">
                                <ResponsiveBar
                                    data={topProducts.map((product) => ({
                                        product: product.name,
                                        terjual: product.qty,
                                    }))}
                                    keys={['terjual']}
                                    indexBy="product"
                                    layout="horizontal"
                                    margin={{ top: 8, right: 16, bottom: 28, left: 112 }}
                                    padding={0.35}
                                    valueScale={{ type: 'linear' }}
                                    indexScale={{ type: 'band', round: true }}
                                    colors={['var(--chart-1)']}
                                    borderRadius={4}
                                    enableLabel={false}
                                    enableGridX
                                    enableGridY={false}
                                    axisTop={null}
                                    axisRight={null}
                                    axisBottom={{
                                        tickSize: 0,
                                        tickPadding: 8,
                                        legend: 'Unit terjual',
                                        legendPosition: 'middle',
                                        legendOffset: 24,
                                    }}
                                    axisLeft={{
                                        tickSize: 0,
                                        tickPadding: 8,
                                    }}
                                    theme={{
                                        axis: {
                                            ticks: {
                                                text: {
                                                    fill: 'var(--muted-foreground)',
                                                    fontSize: 11,
                                                },
                                            },
                                            legend: {
                                                text: {
                                                    fill: 'var(--muted-foreground)',
                                                    fontSize: 11,
                                                },
                                            },
                                        },
                                        grid: {
                                            line: {
                                                stroke: 'var(--border)',
                                                strokeDasharray: '3 3',
                                            },
                                        },
                                    }}
                                />
                            </div>
                        ) : (
                            <EmptyState
                                icon={Trophy}
                                title="Belum ada data penjualan"
                                description="Chart akan muncul setelah ada transaksi."
                            />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-medium">
                            Stok Menipis
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {lowStock.length > 0 ? (
                            <div className="h-64 w-full">
                                <ResponsiveBar
                                    data={lowStock.map((item) => ({
                                        product: item.name,
                                        stok: item.stock,
                                        batas: item.threshold,
                                    }))}
                                    keys={['stok', 'batas']}
                                    indexBy="product"
                                    layout="horizontal"
                                    groupMode="grouped"
                                    margin={{ top: 8, right: 16, bottom: 28, left: 112 }}
                                    padding={0.3}
                                    valueScale={{ type: 'linear' }}
                                    indexScale={{ type: 'band', round: true }}
                                    colors={['var(--destructive)', 'var(--chart-4)']}
                                    borderRadius={4}
                                    enableLabel={false}
                                    enableGridX
                                    enableGridY={false}
                                    axisTop={null}
                                    axisRight={null}
                                    axisBottom={{ tickSize: 0, tickPadding: 8 }}
                                    axisLeft={{ tickSize: 0, tickPadding: 8 }}
                                    legends={[
                                        {
                                            dataFrom: 'keys',
                                            anchor: 'bottom-right',
                                            direction: 'row',
                                            justify: false,
                                            translateY: 48,
                                            itemsSpacing: 12,
                                            itemWidth: 70,
                                            itemHeight: 18,
                                            symbolSize: 10,
                                        },
                                    ]}
                                    theme={{
                                        axis: {
                                            ticks: {
                                                text: {
                                                    fill: 'var(--muted-foreground)',
                                                    fontSize: 11,
                                                },
                                            },
                                        },
                                        grid: {
                                            line: {
                                                stroke: 'var(--border)',
                                                strokeDasharray: '3 3',
                                            },
                                        },
                                        legends: {
                                            text: {
                                                fill: 'var(--muted-foreground)',
                                                fontSize: 11,
                                            },
                                        },
                                    }}
                                />
                            </div>
                        ) : (
                            <EmptyState
                                icon={TriangleAlert}
                                title="Semua stok aman"
                                description="Chart akan muncul saat ada stok di bawah batas minimum."
                            />
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base font-medium">
                            Aktivitas Transaksi per Jam · Hari ini
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 w-full">
                            <ResponsiveBar
                                data={hourlySales}
                                keys={['transactions']}
                                indexBy="label"
                                margin={{ top: 8, right: 12, bottom: 32, left: 38 }}
                                padding={0.25}
                                valueScale={{ type: 'linear' }}
                                indexScale={{ type: 'band', round: true }}
                                colors={['var(--chart-2)']}
                                borderRadius={3}
                                enableLabel={false}
                                enableGridX={false}
                                axisTop={null}
                                axisRight={null}
                                axisLeft={{ tickSize: 0, tickPadding: 8 }}
                                axisBottom={{
                                    tickSize: 0,
                                    tickPadding: 8,
                                    tickRotation: -45,
                                    tickValues: 8,
                                }}
                                theme={{
                                    axis: {
                                        ticks: {
                                            text: {
                                                fill: 'var(--muted-foreground)',
                                                fontSize: 10,
                                            },
                                        },
                                    },
                                    grid: {
                                        line: {
                                            stroke: 'var(--border)',
                                            strokeDasharray: '3 3',
                                        },
                                    },
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-medium">
                            Komposisi Pembayaran
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {paymentSummary.length > 0 ? (
                            <>
                                <div className="h-52 w-full">
                                    <ResponsivePie
                                    data={paymentSummary.map((item) => ({
                                        id: item.method,
                                        label:
                                            paymentMethodLabel[item.method] ??
                                            item.method,
                                        value: item.amount,
                                    }))}
                                    margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                                    innerRadius={0.62}
                                    padAngle={1.5}
                                    cornerRadius={3}
                                    activeOuterRadiusOffset={5}
                                    colors={['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']}
                                    borderWidth={0}
                                    enableArcLinkLabels={false}
                                    arcLabelsSkipAngle={12}
                                    arcLabelsTextColor="var(--card)"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3">
                                    {paymentSummary.map((item, index) => (
                                        <div
                                            key={item.method}
                                            className="flex min-w-0 items-center justify-between gap-2 text-xs"
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span
                                                    className="size-2 shrink-0 rounded-full"
                                                    style={{
                                                        backgroundColor: `var(--chart-${(index % 5) + 1})`,
                                                    }}
                                                />
                                                <span className="truncate text-muted-foreground">
                                                    {paymentMethodLabel[item.method] ??
                                                        item.method}
                                                </span>
                                            </span>
                                            <span className="shrink-0 font-medium tabular-nums">
                                                {formatIDR(item.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <EmptyState
                                icon={ReceiptText}
                                title="Belum ada pembayaran"
                                description="Komposisi metode pembayaran akan muncul setelah transaksi."
                            />
                        )}
                    </CardContent>
                </Card>

            </div>

            <BriefingCard initialBriefing={briefing} />

            <AnomalyCard anomalies={anomalies} />

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-medium">
                            Produk Terlaris · 7 hari terakhir
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
                                                    {product.sku}
                                                </p>
                                            </td>
                                            <td className="px-2 py-2.5 text-right tabular-nums">
                                                {product.qty} terjual
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
                                icon={Trophy}
                                title="Belum ada data penjualan"
                                description="Produk terlaris akan muncul di sini setelah ada transaksi yang tercatat."
                            />
                        </CardContent>
                    )}
                </Card>

                <div className="grid content-start gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-medium">
                                Stok Menipis
                            </CardTitle>
                        </CardHeader>
                        {lowStock.length > 0 ? (
                            <CardContent className="p-0">
                                <table className="w-full text-sm">
                                    <tbody>
                                        {lowStock.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="border-t first:border-0"
                                            >
                                                <td className="px-4 py-2.5">
                                                    <p className="font-medium">
                                                        {item.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.sku}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-2.5 text-right tabular-nums">
                                                    <span className="font-medium">
                                                        {item.stock}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {' '}
                                                        / batas {item.threshold}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        ) : (
                            <CardContent className="pt-0">
                                <EmptyState
                                    icon={TriangleAlert}
                                    title="Semua stok aman"
                                    description="Produk dengan stok di bawah batas minimum akan muncul di sini."
                                />
                            </CardContent>
                        )}
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-medium">
                                Transaksi Terakhir
                            </CardTitle>
                        </CardHeader>
                        {recentSales.length > 0 ? (
                            <CardContent className="p-0">
                                <table className="w-full text-sm">
                                    <tbody>
                                        {recentSales.map((sale) => (
                                            <tr
                                                key={sale.id}
                                                className="border-t first:border-0"
                                            >
                                                <td className="px-4 py-2.5">
                                                    <Link
                                                        href={showSale(sale.id)}
                                                        className="font-medium hover:underline"
                                                    >
                                                        {sale.number}
                                                    </Link>
                                                    <p className="text-xs text-muted-foreground">
                                                        {sale.customer?.name ??
                                                            'Umum'}{' '}
                                                        ·{' '}
                                                        {formatTime(
                                                            sale.completed_at ??
                                                                sale.created_at,
                                                        )}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                                                    {formatIDR(
                                                        sale.grand_total,
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        ) : (
                            <CardContent className="pt-0">
                                <EmptyState
                                    icon={Package}
                                    title="Belum ada transaksi"
                                    description="Transaksi dari kasir akan muncul di sini."
                                />
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    title: 'Dashboard',
    description: 'Ringkasan aktivitas bisnis Anda hari ini.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
