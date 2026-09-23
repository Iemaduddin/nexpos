import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import {
    cancel,
    destroy,
    edit,
    index,
    order,
    pay,
    receive,
} from '@/actions/App/Http/Controllers/PurchaseController';
import InputError from '@/components/input-error';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { formatIDR, formatQty } from '@/lib/format';
import { purchasePaymentLabel, purchaseStatusLabel } from '@/lib/purchase';
import { dashboard } from '@/routes';
import type { Purchase } from '@/types';

function formatDate(value: string | null): string {
    if (!value) {
        return '–';
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}

export default function PurchaseShow({ purchase }: { purchase: Purchase }) {
    const { auth } = usePage().props;
    const canPurchase = auth.permissions.includes('inventory.purchase');

    const [receiving, setReceiving] = useState(false);
    const [paying, setPaying] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const items = purchase.items ?? [];
    const remaining = purchase.grand_total - purchase.paid_amount;
    const canReceive =
        purchase.status === 'ordered' || purchase.status === 'partial';
    const receivedAny = items.some((item) => item.qty_received > 0);

    return (
        <>
            <Head title={purchase.number} />

            <div className="grid gap-4">
                <Card>
                    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="text-lg">
                                    {purchase.number}
                                </CardTitle>
                                <Badge
                                    variant={
                                        purchase.status === 'cancelled'
                                            ? 'destructive'
                                            : purchase.status === 'received'
                                              ? 'default'
                                              : purchase.status === 'draft'
                                                ? 'secondary'
                                                : 'outline'
                                    }
                                >
                                    {purchaseStatusLabel[purchase.status]}
                                </Badge>
                                <Badge
                                    variant={
                                        purchase.payment_status === 'paid'
                                            ? 'default'
                                            : 'secondary'
                                    }
                                >
                                    {purchasePaymentLabel[
                                        purchase.payment_status
                                    ] ?? purchase.payment_status}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {purchase.supplier?.name ?? '–'} &middot;{' '}
                                {purchase.store?.name ?? '–'}
                            </p>
                        </div>
                        {canPurchase && (
                            <div className="flex flex-wrap items-center gap-2">
                                {purchase.status === 'draft' && (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link href={edit(purchase.id)}>
                                                <Pencil className="size-4" />
                                                Ubah
                                            </Link>
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                router.patch(
                                                    order(purchase.id).url,
                                                )
                                            }
                                        >
                                            Tandai Dipesan
                                        </Button>
                                    </>
                                )}
                                {canReceive && (
                                    <Button
                                        size="sm"
                                        onClick={() => setReceiving(true)}
                                    >
                                        Terima Barang
                                    </Button>
                                )}
                                {purchase.status !== 'cancelled' &&
                                    remaining > 0 && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setPaying(true)}
                                        >
                                            Catat Pembayaran
                                        </Button>
                                    )}
                                {(purchase.status === 'draft' ||
                                    purchase.status === 'ordered') &&
                                    !receivedAny && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                router.patch(
                                                    cancel(purchase.id).url,
                                                )
                                            }
                                        >
                                            Batalkan
                                        </Button>
                                    )}
                                {purchase.status === 'draft' && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => setDeleting(true)}
                                    >
                                        <Trash2 className="size-4" />
                                        Hapus
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <dt className="text-muted-foreground">
                                    Dipesan pada
                                </dt>
                                <dd className="font-medium">
                                    {formatDate(purchase.ordered_at)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Perkiraan datang
                                </dt>
                                <dd className="font-medium">
                                    {formatDate(purchase.expected_at)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Diterima pada
                                </dt>
                                <dd className="font-medium">
                                    {formatDate(purchase.received_at)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Dibuat oleh
                                </dt>
                                <dd className="font-medium">
                                    {purchase.creator?.name ?? '–'}
                                </dd>
                            </div>
                        </dl>
                        {purchase.notes && (
                            <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                                {purchase.notes}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-medium">
                            Item Barang
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
                                            Dipesan
                                        </th>
                                        <th className="px-4 py-2.5 font-medium">
                                            Diterima
                                        </th>
                                        <th className="px-4 py-2.5 font-medium">
                                            Harga Beli
                                        </th>
                                        <th className="px-4 py-2.5 text-right font-medium">
                                            Subtotal
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="border-b last:border-0"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-medium">
                                                    {item.product?.name ?? '–'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.variant
                                                        ? `${item.variant.name} · `
                                                        : ''}
                                                    {item.product?.sku ?? ''}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 tabular-nums">
                                                {formatQty(item.qty_ordered)}
                                            </td>
                                            <td className="px-4 py-3 tabular-nums">
                                                {formatQty(item.qty_received)}
                                            </td>
                                            <td className="px-4 py-3 tabular-nums">
                                                {formatIDR(item.cost_price)}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                {formatIDR(item.subtotal)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="grid gap-1 pt-6 text-sm tabular-nums">
                        <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal</span>
                            <span>{formatIDR(purchase.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Diskon</span>
                            <span>−{formatIDR(purchase.discount)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Pajak</span>
                            <span>+{formatIDR(purchase.tax)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 text-base font-semibold">
                            <span>Total</span>
                            <span>{formatIDR(purchase.grand_total)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Sudah dibayar</span>
                            <span>{formatIDR(purchase.paid_amount)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                            <span>Sisa tagihan</span>
                            <span>{formatIDR(remaining)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={receiving} onOpenChange={setReceiving}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Terima barang</DialogTitle>
                        <DialogDescription>
                            Masukkan jumlah yang diterima untuk setiap item.
                            Stok akan langsung bertambah.
                        </DialogDescription>
                    </DialogHeader>
                    <Form
                        {...receive.form(purchase.id)}
                        options={{ preserveScroll: true }}
                    >
                        {({ processing, errors }) => (
                            <div className="grid gap-3">
                                {items
                                    .filter(
                                        (item) =>
                                            item.qty_received <
                                            item.qty_ordered,
                                    )
                                    .map((item, i) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between gap-3 rounded-lg border p-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">
                                                    {item.product?.name}
                                                    {item.variant
                                                        ? ` · ${item.variant.name}`
                                                        : ''}
                                                </p>
                                                <p className="text-xs text-muted-foreground tabular-nums">
                                                    Sisa{' '}
                                                    {item.qty_ordered -
                                                        item.qty_received}
                                                </p>
                                                <input
                                                    type="hidden"
                                                    name={`items[${i}][id]`}
                                                    value={item.id}
                                                />
                                            </div>
                                            <Input
                                                name={`items[${i}][qty]`}
                                                type="number"
                                                min={0}
                                                step="any"
                                                max={
                                                    item.qty_ordered -
                                                    item.qty_received
                                                }
                                                defaultValue={
                                                    item.qty_ordered -
                                                    item.qty_received
                                                }
                                                className="w-24 tabular-nums"
                                                aria-label={`Jumlah diterima ${item.product?.name}`}
                                            />
                                        </div>
                                    ))}
                                <InputError message={errors.items} />
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Batal</Button>
                                    </DialogClose>
                                    <Button type="submit" disabled={processing}>
                                        {processing && <Spinner />}
                                        Simpan Penerimaan
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog open={paying} onOpenChange={setPaying}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Catat pembayaran</DialogTitle>
                        <DialogDescription>
                            Sisa tagihan {formatIDR(remaining)}.
                        </DialogDescription>
                    </DialogHeader>
                    <Form
                        {...pay.form(purchase.id)}
                        options={{ preserveScroll: true }}
                    >
                        {({ processing, errors }) => (
                            <div className="grid gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="amount">
                                        Jumlah dibayar (Rp)
                                    </Label>
                                    <Input
                                        id="amount"
                                        name="amount"
                                        type="number"
                                        min={1}
                                        max={remaining}
                                        defaultValue={remaining}
                                        required
                                        autoFocus
                                        className="tabular-nums"
                                    />
                                    <InputError message={errors.amount} />
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Batal</Button>
                                    </DialogClose>
                                    <Button type="submit" disabled={processing}>
                                        {processing && <Spinner />}
                                        Simpan Pembayaran
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog open={deleting} onOpenChange={setDeleting}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus draf?</DialogTitle>
                        <DialogDescription>
                            Draf {purchase.number} akan dihapus permanen.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Batal</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={() =>
                                router.delete(destroy(purchase.id).url, {
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

PurchaseShow.layout = {
    title: 'Detail Pembelian',
    description: 'Rincian pembelian, penerimaan barang, dan pembayaran.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Pembelian',
            href: index(),
        },
        {
            title: 'Detail',
        },
    ],
};
