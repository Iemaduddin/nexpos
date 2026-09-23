import { Head } from '@inertiajs/react';
import { useState } from 'react';
import {
    index,
    update,
} from '@/actions/App/Http/Controllers/StockAdjustmentController';
import AdjustmentForm, {
    newAdjustmentRow,
    type AdjustmentItemRow,
} from './adjustment-form';
import { dashboard } from '@/routes';
import type { ProductOption, StockAdjustment, StoreOption } from '@/types';

export default function AdjustmentEdit({
    adjustment,
    stores,
    products,
}: {
    adjustment: StockAdjustment;
    stores: StoreOption[];
    products: ProductOption[];
}) {
    const [initialItems] = useState<AdjustmentItemRow[]>(() =>
        (adjustment.items ?? []).map((item) => ({
            ...newAdjustmentRow(),
            product_id: item.product_id.toString(),
            variant_id: item.variant_id?.toString() ?? '',
            qty_actual: item.qty_actual.toString(),
        })),
    );

    return (
        <>
            <Head title={`Ubah ${adjustment.number}`} />

            <AdjustmentForm
                action={update.form(adjustment.id)}
                initial={{
                    store_id: adjustment.store_id.toString(),
                    type: adjustment.type,
                    reason: adjustment.reason ?? '',
                }}
                initialItems={initialItems}
                stores={stores}
                products={products}
                submitLabel="Simpan Perubahan"
            />
        </>
    );
}

AdjustmentEdit.layout = {
    title: 'Ubah Penyesuaian',
    description: 'Perbarui draf penyesuaian yang belum disetujui.',
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
            title: 'Ubah',
        },
    ],
};
