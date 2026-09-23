import { Head } from '@inertiajs/react';
import {
    index,
    store,
} from '@/actions/App/Http/Controllers/PurchaseController';
import PurchaseForm, { newItemRow } from './purchase-form';
import { dashboard } from '@/routes';
import type { OptionItem, ProductOption, StoreOption } from '@/types';

export default function PurchaseCreate({
    suppliers,
    stores,
    products,
}: {
    suppliers: OptionItem[];
    stores: StoreOption[];
    products: ProductOption[];
}) {
    const mainStore = stores.find((store) => store.is_main);

    return (
        <>
            <Head title="Buat Pembelian" />

            <PurchaseForm
                action={store.form()}
                initial={{
                    supplier_id: '',
                    store_id: mainStore ? mainStore.id.toString() : '',
                    expected_at: '',
                    discount: '',
                    tax: '',
                    notes: '',
                }}
                initialItems={[newItemRow()]}
                suppliers={suppliers}
                stores={stores}
                products={products}
                submitLabel="Simpan Draf"
            />
        </>
    );
}

PurchaseCreate.layout = {
    title: 'Buat Pembelian',
    description: 'Buat draf pembelian barang dari supplier.',
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
            title: 'Buat',
        },
    ],
};
