import { Head } from '@inertiajs/react';
import { index, store } from '@/actions/App/Http/Controllers/StoreController';
import StoreForm from './store-form';
import { dashboard } from '@/routes';

export default function StoreCreate() {
    return (
        <>
            <Head title="Tambah Gerai" />

            <StoreForm
                action={store.form()}
                initial={{
                    code: '',
                    name: '',
                    address: '',
                    phone: '',
                    is_main: false,
                    is_active: true,
                }}
                submitLabel="Simpan Gerai"
            />
        </>
    );
}

StoreCreate.layout = {
    title: 'Tambah Gerai',
    description: 'Buka toko atau cabang baru.',
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
            title: 'Tambah',
        },
    ],
};
