import { Head, Link } from "@inertiajs/react";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveLine } from "@nivo/line";
import { CalendarRange, TrendingDown, TrendingUp } from "lucide-react";
import { index } from "@/actions/App/Http/Controllers/ReportController";
import EmptyState from "@/components/empty-state";
import StatCard from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR } from "@/lib/format";
import { confidenceLabel, segmentLabel } from "@/lib/ml";
import { dashboard } from "@/routes";
import type {
    AffinityPair,
    CategoryRevenue,
    DailyRow,
    ForecastDigest,
    Overview,
    TopProduct,
} from "@/types";

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
}) {
    const stats = [
        {
            title: "Pendapatan Kotor",
            value: formatIDR(overview.revenue),
            sub: `${overview.transactions} transaksi`,
            icon: TrendingUp,
        },
        {
            title: "Refund",
            value: formatIDR(overview.refunds),
            sub: "pengembalian ke pelanggan",
            icon: TrendingDown,
        },
        {
            title: "Pendapatan Bersih",
            value: formatIDR(overview.net_revenue),
            sub: `rata-rata ${formatIDR(overview.avg_transaction)}`,
            icon: TrendingUp,
        },
        {
            title: "Laba Kotor",
            value: formatIDR(overview.profit),
            sub: `${overview.items_sold} item terjual`,
            icon: TrendingUp,
        },
    ];

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
                            variant={period === value ? "default" : "outline"}
                            asChild
                        >
                            <Link
                                href={index.url({ query: { period: value } })}
                            >
                                {label}
                            </Link>
                        </Button>
                    ))}
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
                                            id: "Pendapatan",
                                            data: daily.map((row) => ({
                                                x: row.label,
                                                y: row.revenue,
                                            })),
                                        },
                                        {
                                            id: "Laba",
                                            data: daily.map((row) => ({
                                                x: row.label,
                                                y: row.profit,
                                            })),
                                        },
                                        {
                                            id: "Refund",
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
                                    xScale={{ type: "point" }}
                                    yScale={{
                                        type: "linear",
                                        min: "auto",
                                        max: "auto",
                                        stacked: false,
                                        reverse: false,
                                    }}
                                    curve="monotoneX"
                                    colors={[
                                        "var(--chart-1)",
                                        "var(--chart-2)",
                                        "var(--destructive)",
                                    ]}
                                    lineWidth={2}
                                    pointSize={7}
                                    pointColor="var(--card)"
                                    pointBorderWidth={2}
                                    pointBorderColor={{ from: "serieColor" }}
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
                                        format: (value) =>
                                            `${Math.round(Number(value) / 1000)}k`,
                                    }}
                                    enableSlices="x"
                                    sliceTooltip={({ slice }) => (
                                        <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
                                            <p className="mb-1 font-medium">
                                                {
                                                    slice.points[0]?.data
                                                        .xFormatted
                                                }
                                            </p>
                                            {slice.points.map((point) => (
                                                <p
                                                    key={point.id}
                                                    className="flex justify-between gap-4"
                                                >
                                                    <span>
                                                        {point.seriesId}
                                                    </span>
                                                    <span className="font-medium tabular-nums">
                                                        {formatIDR(
                                                            Number(
                                                                point.data.y,
                                                            ),
                                                        )}
                                                    </span>
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                    legends={[
                                        {
                                            anchor: "bottom",
                                            direction: "row",
                                            translateY: 40,
                                            itemsSpacing: 18,
                                            itemWidth: 90,
                                            itemHeight: 18,
                                            symbolSize: 10,
                                        },
                                    ]}
                                    theme={{
                                        axis: {
                                            ticks: {
                                                text: {
                                                    fill: "var(--muted-foreground)",
                                                    fontSize: 11,
                                                },
                                            },
                                        },
                                        grid: {
                                            line: {
                                                stroke: "var(--border)",
                                                strokeDasharray: "3 3",
                                            },
                                        },
                                        legends: {
                                            text: {
                                                fill: "var(--muted-foreground)",
                                                fontSize: 11,
                                            },
                                        },
                                    }}
                                />
                            </div>
                        </CardContent>
                    ) : (
                        <CardContent>
                            <EmptyState
                                icon={TrendingUp}
                                title="Belum ada tren"
                                description="Chart akan muncul setelah ada transaksi."
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
                                    keys={["unit"]}
                                    indexBy="produk"
                                    margin={{
                                        top: 8,
                                        right: 12,
                                        bottom: 36,
                                        left: 12,
                                    }}
                                    padding={0.35}
                                    valueScale={{ type: "linear" }}
                                    indexScale={{ type: "band", round: true }}
                                    colors={["var(--chart-3)"]}
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
                                    }}
                                    theme={{
                                        axis: {
                                            ticks: {
                                                text: {
                                                    fill: "var(--muted-foreground)",
                                                    fontSize: 10,
                                                },
                                            },
                                        },
                                        grid: {
                                            line: {
                                                stroke: "var(--border)",
                                                strokeDasharray: "3 3",
                                            },
                                        },
                                    }}
                                />
                            </div>
                        </CardContent>
                    ) : (
                        <CardContent>
                            <EmptyState
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
                                    keys={["revenue"]}
                                    indexBy="name"
                                    margin={{
                                        top: 8,
                                        right: 16,
                                        bottom: 48,
                                        left: 72,
                                    }}
                                    padding={0.35}
                                    valueScale={{ type: "linear" }}
                                    indexScale={{ type: "band", round: true }}
                                    colors={["var(--chart-4)"]}
                                    borderRadius={4}
                                    enableLabel={false}
                                    enableGridX={false}
                                    axisTop={null}
                                    axisRight={null}
                                    axisLeft={{
                                        tickSize: 0,
                                        tickPadding: 8,
                                        format: (value) =>
                                            `${Math.round(Number(value) / 1000)}k`,
                                    }}
                                    axisBottom={{
                                        tickSize: 0,
                                        tickPadding: 8,
                                        tickRotation: -25,
                                    }}
                                    theme={{
                                        axis: {
                                            ticks: {
                                                text: {
                                                    fill: "var(--muted-foreground)",
                                                    fontSize: 10,
                                                },
                                            },
                                        },
                                        grid: {
                                            line: {
                                                stroke: "var(--border)",
                                                strokeDasharray: "3 3",
                                            },
                                        },
                                    }}
                                />
                            </div>
                        </CardContent>
                    ) : (
                        <CardContent>
                            <EmptyState
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
                    </CardHeader>
                    {daily.some((row) => row.transactions > 0) ? (
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
                                        <th className="px-4 py-2.5 text-right font-medium">
                                            Laba
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {daily.map((row) => (
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
                                                    Keyakinan{" "}
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
    title: "Laporan Penjualan",
    description: "Kinerja bisnis per periode dengan angka yang pasti.",
    breadcrumbs: [
        {
            title: "Dashboard",
            href: dashboard(),
        },
        {
            title: "Laporan",
        },
    ],
};
