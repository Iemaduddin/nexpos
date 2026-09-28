import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Pencil, ReceiptText } from 'lucide-react';
import { show as showSale } from '@/actions/App/Http/Controllers/SaleController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatIDR } from '@/lib/format';
import { saleStatusLabel } from '@/lib/sale';
import { dashboard } from '@/routes';
import { index } from '@/routes/customers';
import type { Customer } from '@/types';
import { CustomerEditDialog } from './customer-form';

type SaleRow = {
    id: number;
    number: string;
    grand_total: number;
    paid_total: number;
    change_amount: number;
    status: string;
    completed_at: string | null;
};

export default function CustomerShow({
    customer,
    sales,
}: {
    customer: Customer;
    sales: SaleRow[];
}) {
    const { auth } = usePage().props;
    const canManage = auth.permissions.includes('customers.manage');
    const [editing, setEditing] = useState(false);

    return (
        <>
            <Head title={customer.name} />

            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>{customer.name}</CardTitle>
                        <p className="text-xs text-muted-foreground tabular-nums">
                            {customer.code}
                        </p>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                                Telepon
                            </span>
                            <span>{customer.phone ?? '–'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Email</span>
                            <span className="truncate">
                                {customer.email ?? '–'}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Alamat</span>
                            <span className="text-right">
                                {customer.address ?? '–'}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                                Transaksi
                            </span>
                            <span className="tabular-nums">
                                {customer.transaction_count}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                                Total belanja
                            </span>
                            <span className="font-medium tabular-nums">
                                {formatIDR(customer.total_spent)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Status</span>
                            <Badge
                                variant={
                                    customer.is_active ? 'default' : 'secondary'
                                }
                            >
                                {customer.is_active ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                        </div>
                        {canManage && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => setEditing(true)}
                            >
                                <Pencil className="size-4" />
                                Ubah
                            </Button>
                        )}
                        <CustomerEditDialog
                            customer={customer}
                            open={editing}
                            onOpenChange={setEditing}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-medium">
                            <ReceiptText className="size-4" />
                            Riwayat belanja terakhir
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {sales.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-muted-foreground">
                                            <th className="px-4 py-2.5 font-medium">
                                                Nomor
                                            </th>
                                            <th className="px-4 py-2.5 font-medium">
                                                Tanggal
                                            </th>
                                            <th className="px-4 py-2.5 text-right font-medium tabular-nums">
                                                Total
                                            </th>
                                            <th className="px-4 py-2.5 font-medium">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sales.map((sale) => (
                                            <tr
                                                key={sale.id}
                                                className="border-b transition-colors last:border-0 hover:bg-muted/50"
                                            >
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={showSale(
                                                            sale.id,
                                                        )}
                                                        className="font-medium hover:underline"
                                                    >
                                                        {sale.number}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                                                    {sale.completed_at
                                                        ? new Date(
                                                              sale.completed_at,
                                                          ).toLocaleDateString(
                                                              'id-ID',
                                                              {
                                                                  day: 'numeric',
                                                                  month: 'short',
                                                                  year: 'numeric',
                                                              },
                                                          )
                                                        : '–'}
                                                </td>
                                                <td className="px-4 py-3 text-right tabular-nums">
                                                    {formatIDR(sale.grand_total)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="secondary">
                                                        {saleStatusLabel[
                                                            sale.status
                                                        ] ?? sale.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="p-4 text-sm text-muted-foreground">
                                Belum ada transaksi.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

CustomerShow.layout = {
    title: 'Detail Pelanggan',
    description: 'Informasi dan riwayat belanja pelanggan.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Pelanggan',
            href: index(),
        },
        {
            title: 'Detail',
        },
    ],
};
