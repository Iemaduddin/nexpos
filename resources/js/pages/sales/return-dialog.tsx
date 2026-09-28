import { Form } from '@inertiajs/react';
import { useState } from 'react';
import { store } from '@/actions/App/Http/Controllers/SaleReturnController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { formatIDR } from '@/lib/format';
import type { ReturnableItem, Sale } from '@/types';

type ReturnItemWithLinks = {
    sale_item_id: number | null;
    qty: number;
};

function returnableItems(sale: Sale): ReturnableItem[] {
    const returnedQty: Record<number, number> = {};

    for (const ret of sale.returns ?? []) {
        const items =
            (ret as unknown as { items?: ReturnItemWithLinks[] }).items ?? [];
        for (const returnItem of items) {
            if (returnItem.sale_item_id != null) {
                returnedQty[returnItem.sale_item_id] =
                    (returnedQty[returnItem.sale_item_id] ?? 0) +
                    returnItem.qty;
            }
        }
    }

    const result: ReturnableItem[] = [];

    for (const item of sale.items ?? []) {
        const returned = returnedQty[item.id] ?? 0;
        if (item.qty <= returned) {
            continue;
        }
        result.push({
            id: item.id,
            name: item.product?.name ?? '–',
            variant: item.variant?.name ?? null,
            sku:
                (item.variant_id !== null
                    ? item.variant?.sku
                    : item.product?.sku) ?? '',
            qty: item.qty,
            qty_returned: returned,
            unit_price: item.unit_price,
            discount: item.discount,
        });
    }

    return result;
}

export function ReturnCreateDialog({
    sale,
    open,
    onOpenChange,
}: {
    sale: Sale;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [quantities, setQuantities] = useState<Record<number, string>>({});
    const items = returnableItems(sale);

    function estimate(): number {
        return items.reduce((sum, item) => {
            const qty = Math.min(
                Number(quantities[item.id] ?? 0) || 0,
                item.qty - item.qty_returned,
            );
            const discountPerUnit =
                item.qty > 0 ? item.discount / item.qty : 0;

            return sum + qty * item.unit_price - qty * discountPerUnit;
        }, 0);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Buat Retur · {sale.number}</DialogTitle>
                    <DialogDescription>
                        Catat pengembalian barang dari pelanggan.
                    </DialogDescription>
                </DialogHeader>
                {items.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                        Semua item pada transaksi ini sudah diretur penuh.
                    </p>
                ) : (
                    <Form
                        {...store.form(sale.id)}
                        options={{ preserveScroll: true }}
                        onSuccess={() => onOpenChange(false)}
                        className="grid gap-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-3">
                                    {items.map((item, i) => (
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
                                                    item.qty -
                                                    item.qty_returned
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
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="return-reason">
                                        Alasan
                                    </Label>
                                    <textarea
                                        id="return-reason"
                                        name="reason"
                                        rows={3}
                                        required
                                        maxLength={1000}
                                        placeholder="cth. Barang cacat, pelanggan minta tukar"
                                        className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    />
                                    <InputError message={errors.reason} />
                                </div>

                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => onOpenChange(false)}
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        Simpan Retur (
                                        {formatIDR(estimate())})
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}
