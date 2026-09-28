import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Pencil, Truck } from 'lucide-react';
import { show as showPurchase } from '@/actions/App/Http/Controllers/PurchaseController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatIDR } from '@/lib/format';
import { purchaseStatusLabel } from '@/lib/purchase';
import { dashboard } from '@/routes';
import { index } from '@/routes/suppliers';
import type { Supplier } from '@/types';
import { SupplierEditDialog } from './supplier-form';

type PurchaseRow = {
    id: number;
    number: string;
    status: string;
    grand_total: number;
    created_at: string;
};

export default function SupplierShow({
    supplier,
    purchases,
}: {
    supplier: Supplier;
    purchases: PurchaseRow[];
}) {
    const { auth } = usePage().props;
    const canManage = auth.permissions.includes('suppliers.manage');
    const [editing, setEditing] = useState(false);

    return (
        <>
            <Head title={supplier.name} />

            <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle>{supplier.name}</CardTitle>
                        <p className="text-xs text-muted-foreground tabular-nums">
                            {supplier.code}
                        </p>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">
                                Telepon
                            </span>
                            <span>{supplier.phone ?? '–'}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Email</span>
                            <span className="truncate">
                                {supplier.email ?? '–'}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Alamat</span>
                            <span className="text-right">
                                {supplier.address ?? '–'}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Status</span>
                            <Badge
                                variant={
                                    supplier.is_active ? 'default' : 'secondary'
                                }
                            >
                                {supplier.is_active ? 'Aktif' : 'Nonaktif'}
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
                        <SupplierEditDialog
                            supplier={supplier}
                            open={editing}
                            onOpenChange={setEditing}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-medium">
                            <Truck className="size-4" />
                            Riwayat pembelian terakhir
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {purchases.length > 0 ? (
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
                                        {purchases.map((purchase) => (
                                            <tr
                                                key={purchase.id}
                                                className="border-b transition-colors last:border-0 hover:bg-muted/50"
                                            >
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={showPurchase(
                                                            purchase.id,
                                                        )}
                                                        className="font-medium hover:underline"
                                                    >
                                                        {purchase.number}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                                                    {new Date(
                                                        purchase.created_at,
                                                    ).toLocaleDateString(
                                                        'id-ID',
                                                        {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        },
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right tabular-nums">
                                                    {formatIDR(
                                                        purchase.grand_total,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="secondary">
                                                        {purchaseStatusLabel[
                                                            purchase.status
                                                        ] ?? purchase.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="p-4 text-sm text-muted-foreground">
                                Belum ada pembelian.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

SupplierShow.layout = {
    title: 'Detail Supplier',
    description: 'Informasi dan riwayat pembelian supplier.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Supplier',
            href: index(),
        },
        {
            title: 'Detail',
        },
    ],
};
