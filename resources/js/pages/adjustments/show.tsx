import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import {
    approve,
    destroy,
    edit,
    index,
} from '@/actions/App/Http/Controllers/StockAdjustmentController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { adjustmentStatusLabel, adjustmentTypeLabel } from '@/lib/adjustment';
import { formatQty } from '@/lib/format';
import { dashboard } from '@/routes';
import type { StockAdjustment } from '@/types';

function formatDate(value: string | null): string {
    if (!value) {
        return '–';
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function diffText(diff: number): string {
    const text = formatQty(diff);

    return diff > 0 ? `+${text}` : text;
}

export default function AdjustmentShow({
    adjustment,
}: {
    adjustment: StockAdjustment;
}) {
    const { auth } = usePage().props;
    const canAdjust = auth.permissions.includes('inventory.adjust');

    const [approving, setApproving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const items = adjustment.items ?? [];
    const isDraft = adjustment.status === 'draft';

    return (
        <>
            <Head title={adjustment.number} />

            <div className="grid gap-4">
                <Card>
                    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="text-lg">
                                    {adjustment.number}
                                </CardTitle>
                                <Badge
                                    variant={
                                        adjustment.status === 'approved'
                                            ? 'default'
                                            : 'secondary'
                                    }
                                >
                                    {adjustmentStatusLabel[adjustment.status]}
                                </Badge>
                                <Badge variant="outline">
                                    {adjustmentTypeLabel[adjustment.type]}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {adjustment.store?.name ?? '–'}
                            </p>
                        </div>
                        {canAdjust && isDraft && (
                            <div className="flex flex-wrap items-center gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={edit(adjustment.id)}>
                                        <Pencil className="size-4" />
                                        Ubah
                                    </Link>
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setApproving(true)}
                                >
                                    Setujui & Bukukan
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setDeleting(true)}
                                >
                                    <Trash2 className="size-4" />
                                    Hapus
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <dt className="text-muted-foreground">
                                    Dibuat oleh
                                </dt>
                                <dd className="font-medium">
                                    {adjustment.creator?.name ?? '–'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Disetujui oleh
                                </dt>
                                <dd className="font-medium">
                                    {adjustment.approver?.name ?? '–'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Disetujui pada
                                </dt>
                                <dd className="font-medium">
                                    {formatDate(adjustment.approved_at)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Alasan
                                </dt>
                                <dd className="font-medium">
                                    {adjustment.reason ?? '–'}
                                </dd>
                            </div>
                        </dl>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-medium">
                            Item Opname
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-y text-left text-muted-foreground">
                                        <th className="px-4 py-2.5 font-medium">
                                            Produk
                                        </th>
                                        <th className="px-4 py-2.5 font-medium">
                                            Sistem
                                        </th>
                                        <th className="px-4 py-2.5 font-medium">
                                            Fisik
                                        </th>
                                        <th className="px-4 py-2.5 text-right font-medium">
                                            Selisih
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => {
                                        const system = isDraft
                                            ? (item.qty_system_now ?? 0)
                                            : item.qty_system;
                                        const diff = isDraft
                                            ? item.qty_actual - system
                                            : item.qty_diff;

                                        return (
                                            <tr
                                                key={item.id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="px-4 py-3">
                                                    <p className="font-medium">
                                                        {item.product?.name ??
                                                            '–'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.variant
                                                            ? `${item.variant.name} · `
                                                            : ''}
                                                        {item.product?.sku ??
                                                            ''}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 tabular-nums">
                                                    {formatQty(system)}
                                                    {isDraft && (
                                                        <p className="text-xs text-muted-foreground">
                                                            saat ini
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 tabular-nums">
                                                    {formatQty(item.qty_actual)}
                                                </td>
                                                <td
                                                    className={`px-4 py-3 text-right font-medium tabular-nums ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                                                >
                                                    {diffText(diff)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={approving} onOpenChange={setApproving}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Setujui penyesuaian?</DialogTitle>
                        <DialogDescription>
                            Selisih akan dibukukan ke ledger dan stok
                            diperbarui. Draf yang disetujui tidak dapat diubah
                            lagi.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Batal</Button>
                        </DialogClose>
                        <Button
                            onClick={() =>
                                router.patch(
                                    approve(adjustment.id).url,
                                    {},
                                    {
                                        preserveScroll: true,
                                    },
                                )
                            }
                        >
                            Ya, setujui
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleting} onOpenChange={setDeleting}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus draf?</DialogTitle>
                        <DialogDescription>
                            Draf {adjustment.number} akan dihapus permanen.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Batal</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={() =>
                                router.delete(destroy(adjustment.id).url, {
                                    preserveScroll: true,
                                })
                            }
                        >
                            Ya, hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

AdjustmentShow.layout = {
    title: 'Detail Penyesuaian',
    description: 'Rincian opname dan selisih stok.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Penyesuaian Stok',
            href: index(),
        },
        {
            title: 'Detail',
        },
    ],
};
