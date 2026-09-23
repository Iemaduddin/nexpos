import { Head } from '@inertiajs/react';
import { useState } from 'react';
import {
    index,
    update,
} from '@/actions/App/Http/Controllers/PurchaseController';
import PurchaseForm, {
    newItemRow,
    type PurchaseItemRow,
} from './purchase-form';
import { dashboard } from '@/routes';
import type { OptionItem, ProductOption, Purchase, StoreOption } from '@/types';

export default function PurchaseEdit({
    purchase,
    suppliers,
    stores,
    products,
}: {
    purchase: Purchase;
    suppliers: OptionItem[];
    stores: StoreOption[];
    products: ProductOption[];
}) {
    const [initialItems] = useState<PurchaseItemRow[]>(() =>
        (purchase.items ?? []).map((item) => ({
            ...newItemRow(),
            product_id: item.product_id.toString(),
            variant_id: item.variant_id?.toString() ?? '',
            qty: item.qty_ordered.toString(),
            cost: item.cost_price.toString(),
        })),
    );

    return (
        <>
            <Head title={`Ubah ${purchase.number}`} />

            <PurchaseForm
                action={update.form(purchase.id)}
                initial={{
                    supplier_id: purchase.supplier_id.toString(),
                    store_id: purchase.store_id.toString(),
                    expected_at: purchase.expected_at?.slice(0, 10) ?? '',
                    discount: purchase.discount?.toString() ?? '',
                    tax: purchase.tax?.toString() ?? '',
                    notes: purchase.notes ?? '',
                }}
                initialItems={initialItems}
                suppliers={suppliers}
                stores={stores}
                products={products}
                submitLabel="Simpan Perubahan"
            />
        </>
    );
}

PurchaseEdit.layout = {
    title: 'Ubah Pembelian',
    description: 'Perbarui draf pembelian yang belum dipesan.',
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
            title: 'Ubah',
        },
    ],
};
