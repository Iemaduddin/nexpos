import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Eye, ReceiptText, Search } from 'lucide-react';
import { index, show } from '@/actions/App/Http/Controllers/SaleController';
import EmptyState from '@/components/empty-state';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatIDR } from '@/lib/format';
import { saleStatusLabel } from '@/lib/sale';
import { dashboard } from '@/routes';
import type { Paginated, Sale } from '@/types';

type Props = {
    sales: Paginated<Sale>;
    filters: { search: string; status: string | null };
};

const statusOptions = [
    { value: '', label: 'Semua status' },
    { value: 'completed', label: 'Selesai' },
    { value: 'partial_refund', label: 'Retur sebagian' },
    { value: 'refunded', label: 'Diretur' },
    { value: 'cancelled', label: 'Dibatalkan' },
];

export default function SaleIndex({ sales, filters }: Props) {
    const [query, setQuery] = useState(filters.search ?? '');

    useEffect(() => {
        if (query === (filters.search ?? '')) {
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                index.url({
                    query: {
                        ...(query ? { search: query } : {}),
                        ...(filters.status ? { status: filters.status } : {}),
                    },
                }),
                {},
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        }, 400);

        return () => clearTimeout(timer);
    }, [query, filters.search, filters.status]);

    function navigate(params: Record<string, string | number>) {
        router.get(
            index.url({ query: params }),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    function changeStatus(status: string) {
        navigate({
            ...(query ? { search: query } : {}),
            ...(status ? { status } : {}),
        });
    }

    function goToPage(page: number) {
        navigate({
            ...(query ? { search: query } : {}),
            ...(filters.status ? { status: filters.status } : {}),
            ...(page > 1 ? { page } : {}),
        });
    }

    const isFiltering = Boolean(filters.search || filters.status);

    return (
        <>
            <Head title="Riwayat Penjualan" />

            <Card>
                <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
                    <div className="relative w-full max-w-xs">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cari nomor transaksi..."
                            className="pl-9"
                            aria-label="Cari transaksi"
                        />
                    </div>
                    <select
                        value={filters.status ?? ''}
                        onChange={(e) => changeStatus(e.target.value)}
                        aria-label="Saring status"
                        className="flex h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                        {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                {sales.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="px-4 py-2.5 font-medium">
                                        Nomor
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Pelanggan
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Kasir
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Status
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Total
                                    </th>
                                    <th className="px-4 py-2.5 text-right font-medium">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.data.map((sale) => (
                                    <tr
                                        key={sale.id}
                                        className="border-b transition-colors last:border-0 hover:bg-muted/50"
                                    >
                                        <td className="px-4 py-3">
                                            <Link
                                                href={show(sale.id)}
                                                className="font-medium hover:underline"
                                            >
                                                {sale.number}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {sale.customer?.name ?? 'Umum'}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {sale.cashier?.name ?? '–'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    sale.status === 'completed'
                                                        ? 'default'
                                                        : sale.status ===
                                                            'cancelled'
                                                          ? 'destructive'
                                                          : 'secondary'
                                                }
                                            >
                                                {saleStatusLabel[sale.status] ??
                                                    sale.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {formatIDR(sale.grand_total)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    title="Lihat detail"
                                                    aria-label={`Lihat ${sale.number}`}
                                                >
                                                    <Link href={show(sale.id)}>
                                                        <Eye className="size-4" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <CardContent className="p-0">
                        <EmptyState
                            icon={ReceiptText}
                            title={
                                isFiltering
                                    ? 'Tidak ada hasil'
                                    : 'Belum ada transaksi'
                            }
                            description={
                                isFiltering
                                    ? 'Coba kata kunci atau status lain.'
                                    : 'Transaksi dari kasir akan tercatat di sini.'
                            }
                        />
                    </CardContent>
                )}

                <div className="border-t">
                    <Pagination
                        from={sales.from}
                        to={sales.to}
                        total={sales.total}
                        currentPage={sales.current_page}
                        lastPage={sales.last_page}
                        onPage={goToPage}
                    />
                </div>
            </Card>
        </>
    );
}

SaleIndex.layout = {
    title: 'Riwayat Penjualan',
    description: 'Semua transaksi yang tercatat di kasir.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Riwayat Penjualan',
        },
    ],
};
