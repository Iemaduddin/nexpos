import { Head, Link, router } from '@inertiajs/react';
import { Undo2 } from 'lucide-react';
import { index } from '@/actions/App/Http/Controllers/SaleReturnController';
import { show as showSale } from '@/actions/App/Http/Controllers/SaleController';
import EmptyState from '@/components/empty-state';
import Pagination from '@/components/pagination';
import { Card, CardContent } from '@/components/ui/card';
import { formatIDR } from '@/lib/format';
import { dashboard } from '@/routes';
import type { Paginated, SaleReturn } from '@/types';

export default function ReturnIndex({
    returns,
}: {
    returns: Paginated<SaleReturn>;
}) {
    function goToPage(page: number) {
        router.get(
            index.url({ query: page > 1 ? { page } : {} }),
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Retur & Refund" />

            <Card>
                {returns.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="px-4 py-2.5 font-medium">
                                        Nomor Retur
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Transaksi
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Toko
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Oleh
                                    </th>
                                    <th className="px-4 py-2.5 text-right font-medium">
                                        Total Refund
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {returns.data.map((ret) => (
                                    <tr
                                        key={ret.id}
                                        className="border-b transition-colors last:border-0 hover:bg-muted/50"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            {ret.number}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link
                                                href={showSale(ret.sale_id)}
                                                className="hover:underline"
                                            >
                                                {ret.sale?.number ?? '–'}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {ret.store?.name ?? '–'}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {ret.creator?.name ?? '–'}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {formatIDR(ret.total_refund)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <CardContent className="p-0">
                        <EmptyState
                            icon={Undo2}
                            title="Belum ada retur"
                            description="Retur dari transaksi penjualan akan tercatat di sini."
                        />
                    </CardContent>
                )}

                <div className="border-t">
                    <Pagination
                        from={returns.from}
                        to={returns.to}
                        total={returns.total}
                        currentPage={returns.current_page}
                        lastPage={returns.last_page}
                        onPage={goToPage}
                    />
                </div>
            </Card>
        </>
    );
}

ReturnIndex.layout = {
    title: 'Retur & Refund',
    description: 'Catatan pengembalian barang dari pelanggan.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Retur & Refund',
        },
    ],
};
