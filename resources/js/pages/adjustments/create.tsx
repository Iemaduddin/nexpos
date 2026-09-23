import { Head } from '@inertiajs/react';
import {
    index,
    store,
} from '@/actions/App/Http/Controllers/StockAdjustmentController';
import AdjustmentForm, { newAdjustmentRow } from './adjustment-form';
import { dashboard } from '@/routes';
import type { ProductOption, StoreOption } from '@/types';

export default function AdjustmentCreate({
    stores,
    products,
}: {
    stores: StoreOption[];
    products: ProductOption[];
}) {
    const mainStore = stores.find((store) => store.is_main);

    return (
        <>
            <Head title="Buat Penyesuaian" />

            <AdjustmentForm
                action={store.form()}
                initial={{
                    store_id: mainStore ? mainStore.id.toString() : '',
                    type: '',
                    reason: '',
                }}
                initialItems={[newAdjustmentRow()]}
                stores={stores}
                products={products}
                submitLabel="Simpan Draf"
            />
        </>
    );
}

AdjustmentCreate.layout = {
    title: 'Buat Penyesuaian',
    description: 'Buat draf penyesuaian dari hasil opname.',
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
            title: 'Buat',
        },
    ],
};
