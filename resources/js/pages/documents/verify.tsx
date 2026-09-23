import { Head } from '@inertiajs/react';
import {
    index,
    store,
} from '@/actions/App/Http/Controllers/PurchaseController';
import PurchaseForm, {
    type PurchaseItemRow,
} from '@/pages/purchases/purchase-form';
import { dashboard } from '@/routes';
import type { OptionItem, ProductOption, StoreOption } from '@/types';

type VerifyRow = PurchaseItemRow & { label: string };

export default function DocumentVerify({
    document,
    initial,
    initialItems,
    suppliers,
    stores,
    products,
}: {
    document: { id: number; status: string };
    initial: {
        supplier_id: string;
        store_id: string;
        discount: string;
        tax: string;
        notes: string;
        document_id: number;
    };
    initialItems: VerifyRow[];
    suppliers: OptionItem[];
    stores: StoreOption[];
    products: ProductOption[];
}) {
    const mainStore = stores.find((store) => store.is_main);

    const items: PurchaseItemRow[] = initialItems;

    return (
        <>
            <Head title={`Verifikasi Dokumen #${document.id}`} />

            <p className="-mt-2 mb-2 text-sm text-muted-foreground">
                Periksa setiap baris: cocokkan produk, jumlah, dan harga dengan
                faktur asli sebelum menyimpan sebagai draf pembelian.
            </p>

            <PurchaseForm
                action={store.form()}
                initial={{
                    supplier_id: initial.supplier_id,
                    store_id:
                        initial.store_id ||
                        (mainStore ? mainStore.id.toString() : ''),
                    expected_at: '',
                    discount: initial.discount,
                    tax: initial.tax,
                    notes: initial.notes,
                }}
                initialItems={items}
                suppliers={suppliers}
                stores={stores}
                products={products}
                submitLabel="Simpan Sebagai Draf Pembelian"
                documentId={initial.document_id}
            />
        </>
    );
}

DocumentVerify.layout = {
    title: 'Verifikasi Dokumen',
    description: 'Cocokkan hasil OCR dengan data master sebelum disimpan.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Dokumen',
            href: index(),
        },
        {
            title: 'Verifikasi',
        },
    ],
};
