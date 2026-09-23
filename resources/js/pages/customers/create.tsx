import { Head } from '@inertiajs/react';
import {
    index,
    store,
} from '@/actions/App/Http/Controllers/CustomerController';
import CustomerForm from './customer-form';
import { dashboard } from '@/routes';

export default function CustomerCreate() {
    return (
        <>
            <Head title="Tambah Pelanggan" />

            <CustomerForm
                action={store.form()}
                initial={{
                    name: '',
                    phone: '',
                    email: '',
                    address: '',
                    birthdate: '',
                    is_active: true,
                }}
                submitLabel="Simpan Pelanggan"
            />
        </>
    );
}

CustomerCreate.layout = {
    title: 'Tambah Pelanggan',
    description: 'Daftarkan pelanggan baru.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Pelanggan',
            href: index(),
        },
        {
            title: 'Tambah',
        },
    ],
};
