import { Head } from '@inertiajs/react';
import {
    index,
    update,
} from '@/actions/App/Http/Controllers/ProductController';
import ProductForm, { type VariantRow } from './product-form';
import { dashboard } from '@/routes';
import type { OptionItem, Product, UnitOption } from '@/types';

let rowKey = 1000;

export default function ProductEdit({
    product,
    categories,
    brands,
    units,
}: {
    product: Product;
    categories: OptionItem[];
    brands: OptionItem[];
    units: UnitOption[];
}) {
    const initialVariants: VariantRow[] = (product.variants ?? []).map(
        (variant) => {
            rowKey += 1;

            return {
                key: rowKey,
                id: variant.id,
                name: variant.name,
                sku: variant.sku,
                barcode: variant.barcode ?? '',
                cost_price: variant.cost_price.toString(),
                selling_price: variant.selling_price.toString(),
                low_stock_threshold:
                    variant.low_stock_threshold?.toString() ?? '',
            };
        },
    );

    return (
        <>
            <Head title={`Ubah ${product.name}`} />

            <ProductForm
                action={update.form(product.id)}
                initial={{
                    name: product.name,
                    slug: product.slug,
                    sku: product.sku,
                    barcode: product.barcode ?? '',
                    category_id: product.category_id.toString(),
                    brand_id: product.brand_id?.toString() ?? '',
                    unit_id: product.unit_id.toString(),
                    cost_price: product.cost_price.toString(),
                    selling_price: product.selling_price.toString(),
                    tax_rate: product.tax_rate?.toString() ?? '',
                    track_inventory: product.track_inventory,
                    low_stock_threshold:
                        product.low_stock_threshold?.toString() ?? '',
                    description: product.description ?? '',
                    is_active: product.is_active,
                }}
                initialVariants={initialVariants}
                categories={categories}
                brands={brands}
                units={units}
                existingImageUrl={
                    product.image_path ? `/storage/${product.image_path}` : null
                }
                submitLabel="Simpan Perubahan"
            />
        </>
    );
}

ProductEdit.layout = {
    title: 'Ubah Produk',
    description: 'Perbarui data produk yang sudah ada.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Produk',
            href: index(),
        },
        {
            title: 'Ubah',
        },
    ],
};
