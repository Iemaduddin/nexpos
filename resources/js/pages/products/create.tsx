import { Head } from '@inertiajs/react';
import { index, store } from '@/actions/App/Http/Controllers/ProductController';
import ProductForm from './product-form';
import { dashboard } from '@/routes';
import type { OptionItem, UnitOption } from '@/types';

export default function ProductCreate({
    categories,
    brands,
    units,
}: {
    categories: OptionItem[];
    brands: OptionItem[];
    units: UnitOption[];
}) {
    return (
        <>
            <Head title="Tambah Produk" />

            <ProductForm
                action={store.form()}
                initial={{
                    name: '',
                    slug: '',
                    sku: '',
                    barcode: '',
                    category_id: '',
                    brand_id: '',
                    unit_id: '',
                    cost_price: '',
                    selling_price: '',
                    tax_rate: '',
                    track_inventory: true,
                    low_stock_threshold: '',
                    description: '',
                    is_active: true,
                }}
                initialVariants={[]}
                categories={categories}
                brands={brands}
                units={units}
                submitLabel="Simpan Produk"
            />
        </>
    );
}

ProductCreate.layout = {
    title: 'Tambah Produk',
    description: 'Buat produk baru beserta harga dan variannya.',
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
            title: 'Tambah',
        },
    ],
};
