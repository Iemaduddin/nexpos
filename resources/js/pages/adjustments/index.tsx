import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ClipboardList, Eye, Plus, Search } from 'lucide-react';
import {
    create,
    index,
    show,
} from '@/actions/App/Http/Controllers/StockAdjustmentController';
import EmptyState from '@/components/empty-state';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { adjustmentStatusLabel, adjustmentTypeLabel } from '@/lib/adjustment';
import { dashboard } from '@/routes';
import type { Paginated, StockAdjustment } from '@/types';

type Props = {
    adjustments: Paginated<StockAdjustment>;
    filters: { search: string; status: string | null };
};

const statusOptions = [
    { value: '', label: 'Semua status' },
    { value: 'draft', label: 'Draf' },
    { value: 'approved', label: 'Disetujui' },
];

function IndexActions() {
    const { auth } = usePage().props;

    if (!auth.permissions.includes('inventory.adjust')) {
        return null;
    }

    return (
        <Button asChild>
            <Link href={create()}>
                <Plus className="size-4" />
                Buat Penyesuaian
            </Link>
        </Button>
    );
}

export default function AdjustmentIndex({ adjustments, filters }: Props) {
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
            <Head title="Penyesuaian Stok" />

            <Card>
                <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
                    <div className="relative w-full max-w-xs">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cari nomor..."
                            className="pl-9"
                            aria-label="Cari penyesuaian"
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

                {adjustments.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="px-4 py-2.5 font-medium">
                                        Nomor
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Toko
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Jenis
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Item
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Status
                                    </th>
                                    <th className="px-4 py-2.5 text-right font-medium">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {adjustments.data.map((adjustment) => (
                                    <tr
                                        key={adjustment.id}
                                        className="border-b transition-colors last:border-0 hover:bg-muted/50"
                                    >
                                        <td className="px-4 py-3">
                                            <Link
                                                href={show(adjustment.id)}
                                                className="font-medium hover:underline"
                                            >
                                                {adjustment.number}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {adjustment.store?.name ?? '–'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {adjustmentTypeLabel[
                                                adjustment.type
                                            ] ?? adjustment.type}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {adjustment.items_count ?? 0}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    adjustment.status ===
                                                    'approved'
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {adjustmentStatusLabel[
                                                    adjustment.status
                                                ] ?? adjustment.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    title="Lihat detail"
                                                    aria-label={`Lihat ${adjustment.number}`}
                                                >
                                                    <Link
                                                        href={show(
                                                            adjustment.id,
                                                        )}
                                                    >
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
                            icon={ClipboardList}
                            title={
                                isFiltering
                                    ? 'Tidak ada hasil'
                                    : 'Belum ada penyesuaian'
                            }
                            description={
                                isFiltering
                                    ? 'Coba kata kunci atau status lain.'
                                    : 'Buat penyesuaian pertama dari hasil opname stok.'
                            }
                            action={!isFiltering ? <IndexActions /> : undefined}
                        />
                    </CardContent>
                )}

                <div className="border-t">
                    <Pagination
                        from={adjustments.from}
                        to={adjustments.to}
                        total={adjustments.total}
                        currentPage={adjustments.current_page}
                        lastPage={adjustments.last_page}
                        onPage={goToPage}
                    />
                </div>
            </Card>
        </>
    );
}

AdjustmentIndex.layout = {
    title: 'Penyesuaian Stok',
    description: 'Koreksi stok dari hasil opname fisik.',
    actions: <IndexActions />,
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Penyesuaian Stok',
        },
    ],
};
