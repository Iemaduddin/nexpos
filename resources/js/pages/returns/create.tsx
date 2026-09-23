import { Form, Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { show as showSale } from '@/actions/App/Http/Controllers/SaleController';
import { store } from '@/actions/App/Http/Controllers/SaleReturnController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { formatIDR } from '@/lib/format';
import { dashboard } from '@/routes';
import type { ReturnableItem } from '@/types';

export default function ReturnCreate({
    sale,
    items,
}: {
    sale: { id: number; number: string; status: string };
    items: ReturnableItem[];
}) {
    const [quantities, setQuantities] = useState<Record<number, string>>({});

    const returnable = items.filter((item) => item.qty > item.qty_returned);

    function estimate(): number {
        return returnable.reduce((sum, item) => {
            const qty = Math.min(
                Number(quantities[item.id] ?? 0) || 0,
                item.qty - item.qty_returned,
            );
            const discountPerUnit = item.qty > 0 ? item.discount / item.qty : 0;

            return sum + qty * item.unit_price - qty * discountPerUnit;
        }, 0);
    }

    return (
        <>
            <Head title={`Retur ${sale.number}`} />

            {returnable.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                        Semua item pada transaksi ini sudah diretur penuh.
                    </CardContent>
                </Card>
            ) : (
                <Form
                    {...store.form(sale.id)}
                    options={{ preserveScroll: true }}
                    className="grid max-w-3xl gap-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base font-medium">
                                        Item yang diretur
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-3">
                                    {returnable.map((item, i) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between gap-3 rounded-lg border p-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">
                                                    {item.name}
                                                    {item.variant
                                                        ? ` · ${item.variant}`
                                                        : ''}
                                                </p>
                                                <p className="text-xs text-muted-foreground tabular-nums">
                                                    Sisa{' '}
                                                    {item.qty -
                                                        item.qty_returned}{' '}
                                                    dari {item.qty} ·{' '}
                                                    {formatIDR(item.unit_price)}
                                                </p>
                                                <input
                                                    type="hidden"
                                                    name={`items[${i}][sale_item_id]`}
                                                    value={item.id}
                                                />
                                            </div>
                                            <Input
                                                name={`items[${i}][qty]`}
                                                type="number"
                                                min={0}
                                                step="any"
                                                max={
                                                    item.qty - item.qty_returned
                                                }
                                                value={
                                                    quantities[item.id] ?? '0'
                                                }
                                                onChange={(e) =>
                                                    setQuantities((q) => ({
                                                        ...q,
                                                        [item.id]:
                                                            e.target.value,
                                                    }))
                                                }
                                                className="w-24 tabular-nums"
                                                aria-label={`Jumlah retur ${item.name}`}
                                            />
                                        </div>
                                    ))}
                                    <InputError message={errors.items} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base font-medium">
                                        Alasan Retur
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-2">
                                    <Label htmlFor="reason">Alasan</Label>
                                    <textarea
                                        id="reason"
                                        name="reason"
                                        rows={3}
                                        required
                                        maxLength={1000}
                                        placeholder="cth. Barang cacat, pelanggan minta tukar"
                                        className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    />
                                    <InputError message={errors.reason} />
                                </CardContent>
                            </Card>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Simpan Retur ({formatIDR(estimate())})
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={showSale(sale.id)}>Batal</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            )}
        </>
    );
}

ReturnCreate.layout = {
    title: 'Buat Retur',
    description: 'Catat pengembalian barang dari pelanggan.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Riwayat Penjualan',
        },
        {
            title: 'Buat Retur',
        },
    ],
};
