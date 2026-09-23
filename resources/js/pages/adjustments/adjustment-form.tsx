import { Form, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { index } from '@/actions/App/Http/Controllers/StockAdjustmentController';
import FormSelect from '@/components/form-select';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { adjustmentTypeLabel } from '@/lib/adjustment';
import type { RouteFormDefinition } from '@/wayfinder';
import type { ProductOption, StoreOption } from '@/types';

export type AdjustmentFormInitial = {
    store_id: string;
    type: string;
    reason: string;
};

export type AdjustmentItemRow = {
    key: number;
    product_id: string;
    variant_id: string;
    qty_actual: string;
};

let rowKey = 0;

export function newAdjustmentRow(): AdjustmentItemRow {
    rowKey += 1;

    return { key: rowKey, product_id: '', variant_id: '', qty_actual: '' };
}

const typeOptions = Object.entries(adjustmentTypeLabel).map(([id, name]) => ({
    id,
    name,
}));

export default function AdjustmentForm({
    action,
    initial,
    initialItems,
    stores,
    products,
    submitLabel,
}: {
    action: RouteFormDefinition<'post'>;
    initial: AdjustmentFormInitial;
    initialItems: AdjustmentItemRow[];
    stores: StoreOption[];
    products: ProductOption[];
    submitLabel: string;
}) {
    const [items, setItems] = useState<AdjustmentItemRow[]>(initialItems);

    function updateRow(key: number, patch: Partial<AdjustmentItemRow>) {
        setItems((rows) =>
            rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
        );
    }

    function chooseProduct(key: number, productId: string) {
        updateRow(key, { product_id: productId, variant_id: '' });
    }

    function productOf(row: AdjustmentItemRow): ProductOption | undefined {
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
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-medium">
                                Informasi Penyesuaian
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-5">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <FormSelect
                                    id="store_id"
                                    name="store_id"
                                    label="Toko"
                                    defaultValue={initial.store_id}
                                    options={stores}
                                    error={errors.store_id}
                                    placeholder="— Pilih toko —"
                                />
                                <FormSelect
                                    id="type"
                                    name="type"
                                    label="Jenis penyesuaian"
                                    defaultValue={initial.type}
                                    options={typeOptions}
                                    error={errors.type}
                                    placeholder="— Pilih jenis —"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="reason">
                                    Alasan{' '}
                                    <span className="font-normal text-muted-foreground">
                                        (opsional)
                                    </span>
                                </Label>
                                <textarea
                                    id="reason"
                                    name="reason"
                                    defaultValue={initial.reason}
                                    rows={2}
                                    maxLength={1000}
                                    placeholder="cth. Hasil opname 22 Sep, selisih rak A"
                                    className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                                <InputError message={errors.reason} />
                            </div>
                            <p className="rounded-lg border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                                Stok sistem dicatat otomatis dari data terkini
                                saat draf disetujui, lalu selisihnya dibukukan
                                ke ledger.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-medium">
                                Hasil Opname
                            </CardTitle>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setItems((rows) => [
                                        ...rows,
                                        newAdjustmentRow(),
                                    ])
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
                                    barang hasil opname.
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
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor={`items-${row.key}-actual`}
                                                >
                                                    Stok fisik (hasil hitung)
                                                </Label>
                                                <Input
                                                    id={`items-${row.key}-actual`}
                                                    name={`items[${i}][qty_actual]`}
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    value={row.qty_actual}
                                                    onChange={(e) =>
                                                        updateRow(row.key, {
                                                            qty_actual:
                                                                e.target.value,
                                                        })
                                                    }
                                                    required
                                                    className="tabular-nums"
                                                />
                                                <InputError
                                                    message={
                                                        errors[
                                                            `items.${i}.qty_actual`
                                                        ]
                                                    }
                                                />
                                            </div>
                                            <div className="content-end">
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
                                    </div>
                                );
                            })}
                            <InputError message={errors.items} />
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
