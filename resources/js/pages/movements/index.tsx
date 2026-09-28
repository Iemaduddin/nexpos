import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { History, Search } from 'lucide-react';
import { index } from '@/actions/App/Http/Controllers/StockMovementController';
import EmptyState from '@/components/empty-state';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatQty } from '@/lib/format';
import { dashboard } from '@/routes';
import type { Paginated } from '@/types';

type Movement = {
    id: number;
    type: string;
    reference_type: string | null;
    reference_id: number | null;
    qty_change: number;
    qty_before: number;
    qty_after: number;
    notes: string | null;
    created_at: string;
    product: { id: number; name: string; sku: string } | null;
    variant: { id: number; name: string } | null;
    store: { id: number; name: string } | null;
    creator: { id: number; name: string } | null;
};

type Props = {
    movements: Paginated<Movement>;
    filters: { search: string; type: string | null };
    types: { value: string; label: string }[];
};

export default function MovementIndex({
    movements,
    filters,
    types,
}: Props) {
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
                        ...(filters.type ? { type: filters.type } : {}),
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
    }, [query, filters.search, filters.type]);

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

    function changeType(type: string) {
        navigate({
            ...(query ? { search: query } : {}),
            ...(type ? { type } : {}),
        });
    }

    function goToPage(page: number) {
        navigate({
            ...(query ? { search: query } : {}),
            ...(filters.type ? { type: filters.type } : {}),
            ...(page > 1 ? { page } : {}),
        });
    }

    const isFiltering = Boolean(filters.search || filters.type);

    return (
        <>
            <Head title="Mutasi Stok" />

            <Card>
                <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
                    <div className="relative w-full max-w-xs">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cari produk / SKU..."
                            className="pl-9"
                            aria-label="Cari mutasi"
                        />
                    </div>
                    <select
                        value={filters.type ?? ''}
                        onChange={(e) => changeType(e.target.value)}
                        aria-label="Filter tipe"
                        className="flex h-9 items-center rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring"
                    >
                        <option value="">Semua tipe</option>
                        {types.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                {movements.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="px-4 py-2.5 font-medium">
                                        Waktu
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Produk
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Tipe
                                    </th>
                                    <th className="px-4 py-2.5 text-right font-medium tabular-nums">
                                        Perubahan
                                    </th>
                                    <th className="px-4 py-2.5 text-right font-medium tabular-nums">
                                        Sebelum → Sesudah
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Oleh
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {movements.data.map((movement) => (
                                    <tr
                                        key={movement.id}
                                        className="border-b transition-colors last:border-0 hover:bg-muted/50"
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums">
                                            {new Date(
                                                movement.created_at,
                                            ).toLocaleString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium">
                                                {movement.product?.name ?? '–'}
                                                {movement.variant
                                                    ? ` · ${movement.variant.name}`
                                                    : ''}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {movement.product?.sku ?? ''}
                                                {movement.notes
                                                    ? ` · ${movement.notes}`
                                                    : ''}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    movement.qty_change < 0
                                                        ? 'destructive'
                                                        : 'default'
                                                }
                                            >
                                                {types.find(
                                                    (type) =>
                                                        type.value ===
                                                        movement.type,
                                                )?.label ?? movement.type}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                                            {movement.qty_change > 0 ? '+' : ''}
                                            {formatQty(movement.qty_change)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                                            {formatQty(movement.qty_before)} →{' '}
                                            {formatQty(movement.qty_after)}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {movement.creator?.name ?? 'Sistem'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <CardContent className="p-0">
                        <EmptyState
                            icon={History}
                            title={
                                isFiltering
                                    ? 'Tidak ada hasil'
                                    : 'Belum ada mutasi'
                            }
                            description={
                                isFiltering
                                    ? 'Coba kata kunci atau tipe lain.'
                                    : 'Pergerakan stok dari penjualan, pembelian, dan opname akan tercatat di sini.'
                            }
                        />
                    </CardContent>
                )}

                <div className="border-t">
                    <Pagination
                        from={movements.from}
                        to={movements.to}
                        total={movements.total}
                        currentPage={movements.current_page}
                        lastPage={movements.last_page}
                        onPage={goToPage}
                    />
                </div>
            </Card>
        </>
    );
}

MovementIndex.layout = {
    title: 'Mutasi Stok',
    description: 'Riwayat pergerakan stok semua produk (kartu stok).',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Mutasi Stok',
        },
    ],
};
