import { Head } from '@inertiajs/react';
import { index, update } from '@/actions/App/Http/Controllers/StoreController';
import StoreForm from './store-form';
import { dashboard } from '@/routes';
import type { Store } from '@/types';

export default function StoreEdit({ store }: { store: Store }) {
    return (
        <>
            <Head title={`Ubah ${store.name}`} />

            <StoreForm
                action={update.form(store.id)}
                initial={{
                    code: store.code,
                    name: store.name,
                    address: store.address ?? '',
                    phone: store.phone ?? '',
                    is_main: store.is_main,
                    is_active: store.is_active,
                }}
                submitLabel="Simpan Perubahan"
            />
        </>
    );
}

StoreEdit.layout = {
    title: 'Ubah Gerai',
    description: 'Perbarui data gerai yang sudah ada.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Gerai',
            href: index(),
        },
        {
            title: 'Ubah',
        },
    ],
};
