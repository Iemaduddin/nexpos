import { Form, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { index } from '@/actions/App/Http/Controllers/PurchaseController';
import FormSelect from '@/components/form-select';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { formatIDR } from '@/lib/format';
import type { RouteFormDefinition } from '@/wayfinder';
import type { OptionItem, ProductOption, StoreOption } from '@/types';

export type PurchaseFormInitial = {
    supplier_id: string;
    store_id: string;
    expected_at: string;
    discount: string;
    tax: string;
    notes: string;
};

export type PurchaseItemRow = {
    key: number;
    product_id: string;
    variant_id: string;
    qty: string;
    cost: string;
    label?: string;
};

let rowKey = 0;

export function newItemRow(): PurchaseItemRow {
    rowKey += 1;

    return { key: rowKey, product_id: '', variant_id: '', qty: '', cost: '' };
}

export default function PurchaseForm({
    action,
    initial,
    initialItems,
    suppliers,
    stores,
    products,
    submitLabel,
    documentId,
}: {
    action: RouteFormDefinition<'post'>;
    initial: PurchaseFormInitial;
    initialItems: PurchaseItemRow[];
    suppliers: OptionItem[];
    stores: StoreOption[];
    products: ProductOption[];
    submitLabel: string;
    documentId?: number;
}) {
    const [items, setItems] = useState<PurchaseItemRow[]>(initialItems);
    const [discount, setDiscount] = useState(initial.discount);
    const [tax, setTax] = useState(initial.tax);

    const subtotal = items.reduce(
        (sum, row) => sum + (Number(row.qty) || 0) * (Number(row.cost) || 0),
        0,
    );
    const grand =
        Math.max(0, subtotal - (Number(discount) || 0)) + (Number(tax) || 0);

    function updateRow(key: number, patch: Partial<PurchaseItemRow>) {
        setItems((rows) =>
            rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
        );
    }

    function chooseProduct(key: number, productId: string) {
        const product = products.find((p) => p.id.toString() === productId);
        updateRow(key, {
            product_id: productId,
            variant_id: '',
            cost: product ? product.cost_price.toString() : '',
        });
    }

    function productOf(row: PurchaseItemRow): ProductOption | undefined {
        return products.find((p) => p.id.toString() === row.product_id);
    }

    return (
        <Form
            {...action}
            options={{ preserveScroll: true }}
            className="grid max-w-3xl gap-4"
        >
            {({ processing, errors }) => (
                <>
                    {documentId !== undefined && (
                        <input
                            type="hidden"
                            name="document_id"
                            value={documentId}
                        />
                    )}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-medium">
                                Informasi Pembelian
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-5">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <FormSelect
                                    id="supplier_id"
                                    name="supplier_id"
                                    label="Supplier"
                                    defaultValue={initial.supplier_id}
                                    options={suppliers}
                                    error={errors.supplier_id}
                                    placeholder="— Pilih supplier —"
                                />
                                <FormSelect
                                    id="store_id"
                                    name="store_id"
                                    label="Toko tujuan"
                                    defaultValue={initial.store_id}
                                    options={stores}
                                    error={errors.store_id}
                                    placeholder="— Pilih toko —"
                                />
                            </div>
                            <div className="grid gap-5 sm:grid-cols-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="expected_at">
                                        Perkiraan datang{' '}
                                        <span className="font-normal text-muted-foreground">
                                            (opsional)
                                        </span>
                                    </Label>
                                    <Input
                                        id="expected_at"
                                        name="expected_at"
                                        type="date"
                                        defaultValue={initial.expected_at}
                                    />
                                    <InputError message={errors.expected_at} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="discount">
                                        Diskon (Rp)
                                    </Label>
                                    <Input
                                        id="discount"
                                        name="discount"
                                        type="number"
                                        min={0}
                                        value={discount}
                                        onChange={(e) =>
                                            setDiscount(e.target.value)
                                        }
                                        className="tabular-nums"
                                    />
                                    <InputError message={errors.discount} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="tax">Pajak (Rp)</Label>
                                    <Input
                                        id="tax"
                                        name="tax"
                                        type="number"
                                        min={0}
                                        value={tax}
                                        onChange={(e) => setTax(e.target.value)}
                                        className="tabular-nums"
                                    />
                                    <InputError message={errors.tax} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="notes">
                                    Catatan{' '}
                                    <span className="font-normal text-muted-foreground">
                                        (opsional)
                                    </span>
                                </Label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    defaultValue={initial.notes}
                                    rows={2}
                                    maxLength={1000}
                                    className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                                <InputError message={errors.notes} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-medium">
                                Item Barang
                            </CardTitle>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setItems((rows) => [...rows, newItemRow()])
                                }
                            >
                                <Plus className="size-4" />
                                Tambah Item
                            </Button>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            {items.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Belum ada item. Tambahkan minimal satu
                                    barang yang dibeli.
                                </p>
                            )}
                            {items.map((row, i) => {
                                const product = productOf(row);
                                const needsVariant =
                                    (product?.variants.length ?? 0) > 0;

                                return (
                                    <div
                                        key={row.key}
                                        className="grid gap-3 rounded-lg border p-4"
                                    >
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor={`items-${row.key}-product`}
                                                >
                                                    Produk
                                                </Label>
                                                <select
                                                    id={`items-${row.key}-product`}
                                                    name={`items[${i}][product_id]`}
                                                    value={row.product_id}
                                                    onChange={(e) =>
                                                        chooseProduct(
                                                            row.key,
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                >
                                                    <option value="">
                                                        — Pilih produk —
                                                    </option>
                                                    {products.map((p) => (
                                                        <option
                                                            key={p.id}
                                                            value={p.id}
                                                        >
                                                            {p.name} ({p.sku})
                                                        </option>
                                                    ))}
                                                </select>
                                                <InputError
                                                    message={
                                                        errors[
                                                            `items.${i}.product_id`
                                                        ]
                                                    }
                                                />
                                                {row.label && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Terbaca: {row.label}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor={`items-${row.key}-variant`}
                                                >
                                                    Varian{' '}
                                                    {needsVariant ? (
                                                        <span className="font-normal text-destructive">
                                                            (wajib)
                                                        </span>
                                                    ) : (
                                                        <span className="font-normal text-muted-foreground">
                                                            (opsional)
                                                        </span>
                                                    )}
                                                </Label>
                                                <select
                                                    id={`items-${row.key}-variant`}
                                                    name={`items[${i}][variant_id]`}
                                                    value={row.variant_id}
                                                    onChange={(e) =>
                                                        updateRow(row.key, {
                                                            variant_id:
                                                                e.target.value,
                                                        })
                                                    }
                                                    disabled={!product}
                                                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                                                >
                                                    <option value="">
                                                        — Tanpa varian —
                                                    </option>
                                                    {product?.variants.map(
                                                        (v) => (
                                                            <option
                                                                key={v.id}
                                                                value={v.id}
                                                            >
                                                                {v.name} (
                                                                {v.sku})
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                                <InputError
                                                    message={
                                                        errors[
                                                            `items.${i}.variant_id`
                                                        ]
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-3">
                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor={`items-${row.key}-qty`}
                                                >
                                                    Jumlah
                                                </Label>
                                                <Input
                                                    id={`items-${row.key}-qty`}
                                                    name={`items[${i}][qty_ordered]`}
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    value={row.qty}
                                                    onChange={(e) =>
                                                        updateRow(row.key, {
                                                            qty: e.target.value,
                                                        })
                                                    }
                                                    required
                                                    className="tabular-nums"
                                                />
                                                <InputError
                                                    message={
                                                        errors[
                                                            `items.${i}.qty_ordered`
                                                        ]
                                                    }
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor={`items-${row.key}-cost`}
                                                >
                                                    Harga beli (Rp)
                                                </Label>
                                                <Input
                                                    id={`items-${row.key}-cost`}
                                                    name={`items[${i}][cost_price]`}
                                                    type="number"
                                                    min={0}
                                                    value={row.cost}
                                                    onChange={(e) =>
                                                        updateRow(row.key, {
                                                            cost: e.target
                                                                .value,
                                                        })
                                                    }
                                                    required
                                                    className="tabular-nums"
                                                />
                                                <InputError
                                                    message={
                                                        errors[
                                                            `items.${i}.cost_price`
                                                        ]
                                                    }
                                                />
                                            </div>
                                            <div className="grid content-end gap-2">
                                                <p className="pb-2 text-sm tabular-nums">
                                                    <span className="text-muted-foreground">
                                                        Subtotal:{' '}
                                                    </span>
                                                    <span className="font-medium">
                                                        {formatIDR(
                                                            (Number(row.qty) ||
                                                                0) *
                                                                (Number(
                                                                    row.cost,
                                                                ) || 0),
                                                        )}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() =>
                                                    setItems((rows) =>
                                                        rows.filter(
                                                            (r) =>
                                                                r.key !==
                                                                row.key,
                                                        ),
                                                    )
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                                Hapus item
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                            <InputError message={errors.items} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="grid gap-1 pt-6 text-sm tabular-nums">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Subtotal</span>
                                <span>{formatIDR(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Diskon</span>
                                <span>−{formatIDR(Number(discount) || 0)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Pajak</span>
                                <span>+{formatIDR(Number(tax) || 0)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 text-base font-semibold">
                                <span>Total</span>
                                <span>{formatIDR(grand)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Total dihitung ulang oleh sistem saat disimpan.
                            </p>
                        </CardContent>
                    </Card>

                    <div className="flex items-center gap-2">
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            {submitLabel}
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={index()}>Batal</Link>
                        </Button>
                    </div>
                </>
            )}
        </Form>
    );
}
