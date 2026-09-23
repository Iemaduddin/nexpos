import { Form, Link } from '@inertiajs/react';
import { useState } from 'react';
import { ImagePlus, Plus, Trash2 } from 'lucide-react';
import { index } from '@/actions/App/Http/Controllers/ProductController';
import FormSelect from '@/components/form-select';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { RouteFormDefinition } from '@/wayfinder';
import type { OptionItem, UnitOption } from '@/types';

export type ProductFormInitial = {
    name: string;
    slug: string;
    sku: string;
    barcode: string;
    category_id: string;
    brand_id: string;
    unit_id: string;
    cost_price: string;
    selling_price: string;
    tax_rate: string;
    track_inventory: boolean;
    low_stock_threshold: string;
    description: string;
    is_active: boolean;
};

export type VariantRow = {
    key: number;
    id?: number;
    name: string;
    sku: string;
    barcode: string;
    cost_price: string;
    selling_price: string;
    low_stock_threshold: string;
};

let rowKey = 0;

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function MoneyInput({
    id,
    name,
    defaultValue,
    error,
}: {
    id: string;
    name: string;
    defaultValue: string;
    error?: string;
}) {
    return (
        <div className="grid gap-2">
            <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                    Rp
                </span>
                <Input
                    id={id}
                    name={name}
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={defaultValue}
                    required
                    className="pl-9 tabular-nums"
                />
            </div>
            <InputError message={error} />
        </div>
    );
}

export default function ProductForm({
    action,
    initial,
    initialVariants,
    categories,
    brands,
    units,
    existingImageUrl,
    submitLabel,
}: {
    action: RouteFormDefinition<'post'>;
    initial: ProductFormInitial;
    initialVariants: VariantRow[];
    categories: OptionItem[];
    brands: OptionItem[];
    units: UnitOption[];
    existingImageUrl?: string | null;
    submitLabel: string;
}) {
    const [name, setName] = useState(initial.name);
    const [slug, setSlug] = useState(initial.slug);
    const [slugTouched, setSlugTouched] = useState(initial.slug !== '');
    const [variants, setVariants] = useState<VariantRow[]>(initialVariants);
    const [preview, setPreview] = useState<string | null>(
        existingImageUrl ?? null,
    );

    function addVariant() {
        rowKey += 1;
        setVariants((rows) => [
            ...rows,
            {
                key: rowKey,
                name: '',
                sku: '',
                barcode: '',
                cost_price: '',
                selling_price: '',
                low_stock_threshold: '',
            },
        ]);
    }

    function removeVariant(key: number) {
        setVariants((rows) => rows.filter((row) => row.key !== key));
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
                                Informasi Produk
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-5">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nama produk</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            if (!slugTouched) {
                                                setSlug(
                                                    slugify(e.target.value),
                                                );
                                            }
                                        }}
                                        required
                                        autoFocus
                                        maxLength={255}
                                        placeholder="cth. Kopi Arabica 250g"
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="slug">Slug</Label>
                                    <Input
                                        id="slug"
                                        name="slug"
                                        value={slug}
                                        onChange={(e) => {
                                            setSlugTouched(true);
                                            setSlug(e.target.value);
                                        }}
                                        required
                                        maxLength={255}
                                        placeholder="cth. kopi-arabica-250g"
                                    />
                                    <InputError message={errors.slug} />
                                </div>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="sku">SKU</Label>
                                    <Input
                                        id="sku"
                                        name="sku"
                                        defaultValue={initial.sku}
                                        required
                                        maxLength={50}
                                        placeholder="cth. KPA-250"
                                    />
                                    <InputError message={errors.sku} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="barcode">
                                        Barcode{' '}
                                        <span className="font-normal text-muted-foreground">
                                            (opsional)
                                        </span>
                                    </Label>
                                    <Input
                                        id="barcode"
                                        name="barcode"
                                        defaultValue={initial.barcode}
                                        maxLength={100}
                                        placeholder="cth. 8991234567890"
                                    />
                                    <InputError message={errors.barcode} />
                                </div>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-3">
                                <FormSelect
                                    id="category_id"
                                    name="category_id"
                                    label="Kategori"
                                    defaultValue={initial.category_id}
                                    options={categories}
                                    error={errors.category_id}
                                    placeholder="— Pilih kategori —"
                                />
                                <FormSelect
                                    id="brand_id"
                                    name="brand_id"
                                    label="Brand"
                                    optional
                                    defaultValue={initial.brand_id}
                                    options={brands}
                                    error={errors.brand_id}
                                    placeholder="— Tanpa brand —"
                                />
                                <FormSelect
                                    id="unit_id"
                                    name="unit_id"
                                    label="Satuan"
                                    defaultValue={initial.unit_id}
                                    options={units.map((u) => ({
                                        id: u.id,
                                        name: `${u.name} (${u.symbol})`,
                                    }))}
                                    error={errors.unit_id}
                                    placeholder="— Pilih satuan —"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">
                                    Deskripsi{' '}
                                    <span className="font-normal text-muted-foreground">
                                        (opsional)
                                    </span>
                                </Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    defaultValue={initial.description}
                                    rows={3}
                                    maxLength={1000}
                                    placeholder="Keterangan singkat produk"
                                    className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                                <InputError message={errors.description} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-medium">
                                Harga & Stok
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-5">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="cost_price">
                                        Harga beli
                                    </Label>
                                    <MoneyInput
                                        id="cost_price"
                                        name="cost_price"
                                        defaultValue={initial.cost_price}
                                        error={errors.cost_price}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="selling_price">
                                        Harga jual
                                    </Label>
                                    <MoneyInput
                                        id="selling_price"
                                        name="selling_price"
                                        defaultValue={initial.selling_price}
                                        error={errors.selling_price}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="tax_rate">
                                        Pajak (%){' '}
                                        <span className="font-normal text-muted-foreground">
                                            (opsional)
                                        </span>
                                    </Label>
                                    <Input
                                        id="tax_rate"
                                        name="tax_rate"
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.01}
                                        defaultValue={initial.tax_rate}
                                        className="tabular-nums"
                                    />
                                    <InputError message={errors.tax_rate} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="low_stock_threshold">
                                        Batas stok menipis
                                    </Label>
                                    <Input
                                        id="low_stock_threshold"
                                        name="low_stock_threshold"
                                        type="number"
                                        min={0}
                                        step={1}
                                        defaultValue={
                                            initial.low_stock_threshold
                                        }
                                        placeholder="cth. 10"
                                        className="tabular-nums"
                                    />
                                    <InputError
                                        message={errors.low_stock_threshold}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="hidden"
                                        name="track_inventory"
                                        value="0"
                                    />
                                    <Checkbox
                                        id="track_inventory"
                                        name="track_inventory"
                                        value="1"
                                        defaultChecked={initial.track_inventory}
                                    />
                                    <Label htmlFor="track_inventory">
                                        Lacak stok produk ini
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="hidden"
                                        name="is_active"
                                        value="0"
                                    />
                                    <Checkbox
                                        id="is_active"
                                        name="is_active"
                                        value="1"
                                        defaultChecked={initial.is_active}
                                    />
                                    <Label htmlFor="is_active">
                                        Tampilkan produk (aktif)
                                    </Label>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-medium">
                                Gambar{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opsional)
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-start gap-4">
                            {preview ? (
                                <img
                                    src={preview}
                                    alt="Pratinjau produk"
                                    className="size-24 rounded-lg border object-cover"
                                />
                            ) : (
                                <div className="flex size-24 items-center justify-center rounded-lg border bg-muted/50">
                                    <ImagePlus className="size-6 text-muted-foreground" />
                                </div>
                            )}
                            <div className="grid gap-2">
                                <Label htmlFor="image">File gambar</Label>
                                <Input
                                    id="image"
                                    name="image"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        setPreview(
                                            file
                                                ? URL.createObjectURL(file)
                                                : (existingImageUrl ?? null),
                                        );
                                    }}
                                />
                                <p className="text-xs text-muted-foreground">
                                    JPG, PNG, atau WebP. Maksimal 2 MB.
                                </p>
                                <InputError message={errors.image} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-medium">
                                Varian{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opsional)
                                </span>
                            </CardTitle>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addVariant}
                            >
                                <Plus className="size-4" />
                                Tambah Varian
                            </Button>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            {variants.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Produk tanpa varian dijual sebagai satu
                                    item. Tambahkan varian bila ada pilihan
                                    seperti ukuran atau rasa.
                                </p>
                            )}
                            {variants.map((row, i) => (
                                <div
                                    key={row.key}
                                    className="grid gap-3 rounded-lg border p-4"
                                >
                                    {row.id && (
                                        <input
                                            type="hidden"
                                            name={`variants[${i}][id]`}
                                            value={row.id}
                                        />
                                    )}
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor={`variants-${row.key}-name`}
                                            >
                                                Nama varian
                                            </Label>
                                            <Input
                                                id={`variants-${row.key}-name`}
                                                name={`variants[${i}][name]`}
                                                defaultValue={row.name}
                                                required
                                                maxLength={255}
                                                placeholder="cth. 250 gram"
                                            />
                                            <InputError
                                                message={
                                                    errors[`variants.${i}.name`]
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor={`variants-${row.key}-sku`}
                                            >
                                                SKU varian
                                            </Label>
                                            <Input
                                                id={`variants-${row.key}-sku`}
                                                name={`variants[${i}][sku]`}
                                                defaultValue={row.sku}
                                                required
                                                maxLength={50}
                                                placeholder="cth. KPA-250"
                                            />
                                            <InputError
                                                message={
                                                    errors[`variants.${i}.sku`]
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor={`variants-${row.key}-cost`}
                                            >
                                                Harga beli (Rp)
                                            </Label>
                                            <Input
                                                id={`variants-${row.key}-cost`}
                                                name={`variants[${i}][cost_price]`}
                                                type="number"
                                                min={0}
                                                defaultValue={row.cost_price}
                                                required
                                                className="tabular-nums"
                                            />
                                            <InputError
                                                message={
                                                    errors[
                                                        `variants.${i}.cost_price`
                                                    ]
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor={`variants-${row.key}-price`}
                                            >
                                                Harga jual (Rp)
                                            </Label>
                                            <Input
                                                id={`variants-${row.key}-price`}
                                                name={`variants[${i}][selling_price]`}
                                                type="number"
                                                min={0}
                                                defaultValue={row.selling_price}
                                                required
                                                className="tabular-nums"
                                            />
                                            <InputError
                                                message={
                                                    errors[
                                                        `variants.${i}.selling_price`
                                                    ]
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor={`variants-${row.key}-barcode`}
                                            >
                                                Barcode
                                            </Label>
                                            <Input
                                                id={`variants-${row.key}-barcode`}
                                                name={`variants[${i}][barcode]`}
                                                defaultValue={row.barcode}
                                                maxLength={100}
                                            />
                                            <InputError
                                                message={
                                                    errors[
                                                        `variants.${i}.barcode`
                                                    ]
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() =>
                                                removeVariant(row.key)
                                            }
                                        >
                                            <Trash2 className="size-4" />
                                            Hapus varian
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <InputError message={errors.variants} />
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
