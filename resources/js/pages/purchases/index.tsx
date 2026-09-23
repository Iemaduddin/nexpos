import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Eye, Plus, Search, ShoppingCart } from 'lucide-react';
import {
    create,
    index,
    show,
} from '@/actions/App/Http/Controllers/PurchaseController';
import EmptyState from '@/components/empty-state';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatIDR } from '@/lib/format';
import { purchasePaymentLabel, purchaseStatusLabel } from '@/lib/purchase';
import { dashboard } from '@/routes';
import type { Paginated, Purchase } from '@/types';

type Props = {
    purchases: Paginated<Purchase>;
    filters: { search: string; status: string | null };
};

const statusOptions = [
    { value: '', label: 'Semua status' },
    { value: 'draft', label: 'Draf' },
    { value: 'ordered', label: 'Dipesan' },
    { value: 'partial', label: 'Diterima sebagian' },
    { value: 'received', label: 'Diterima' },
    { value: 'cancelled', label: 'Dibatalkan' },
];

function statusVariant(
    status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
        case 'received':
            return 'default';
        case 'cancelled':
            return 'destructive';
        case 'ordered':
        case 'partial':
            return 'outline';
        default:
            return 'secondary';
    }
}

function IndexActions() {
    const { auth } = usePage().props;

    if (!auth.permissions.includes('inventory.purchase')) {
        return null;
    }

    return (
        <Button asChild>
            <Link href={create()}>
                <Plus className="size-4" />
                Buat Pembelian
            </Link>
        </Button>
    );
}

export default function PurchaseIndex({ purchases, filters }: Props) {
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
            <Head title="Pembelian" />

            <Card>
                <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
                    <div className="relative w-full max-w-xs">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cari nomor / supplier..."
                            className="pl-9"
                            aria-label="Cari pembelian"
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

                {purchases.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="px-4 py-2.5 font-medium">
                                        Nomor
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Supplier
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Status
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Pembayaran
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
                                {purchases.data.map((purchase) => (
                                    <tr
                                        key={purchase.id}
                                        className="border-b transition-colors last:border-0 hover:bg-muted/50"
                                    >
                                        <td className="px-4 py-3">
                                            <Link
                                                href={show(purchase.id)}
                                                className="font-medium hover:underline"
                                            >
                                                {purchase.number}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {purchase.supplier?.name ?? '–'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={statusVariant(
                                                    purchase.status,
                                                )}
                                            >
                                                {purchaseStatusLabel[
                                                    purchase.status
                                                ] ?? purchase.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    purchase.payment_status ===
                                                    'paid'
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {
                                                    purchasePaymentLabel[
                                                        purchase.payment_status
                                                    ]
                                                }
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {formatIDR(purchase.grand_total)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    title="Lihat detail"
                                                    aria-label={`Lihat ${purchase.number}`}
                                                >
                                                    <Link
                                                        href={show(purchase.id)}
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
                            icon={ShoppingCart}
                            title={
                                isFiltering
                                    ? 'Tidak ada hasil'
                                    : 'Belum ada pembelian'
                            }
                            description={
                                isFiltering
                                    ? 'Coba kata kunci atau status lain.'
                                    : 'Buat pembelian pertama untuk menambah stok dari supplier.'
                            }
                            action={!isFiltering ? <IndexActions /> : undefined}
                        />
                    </CardContent>
                )}

                <div className="border-t">
                    <Pagination
                        from={purchases.from}
                        to={purchases.to}
                        total={purchases.total}
                        currentPage={purchases.current_page}
                        lastPage={purchases.last_page}
                        onPage={goToPage}
                    />
                </div>
            </Card>
        </>
    );
}

PurchaseIndex.layout = {
    title: 'Pembelian',
    description: 'Kelola pembelian dan penerimaan barang dari supplier.',
    actions: <IndexActions />,
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Pembelian',
        },
    ],
};
