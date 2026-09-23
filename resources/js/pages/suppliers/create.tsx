import { Head } from '@inertiajs/react';
import {
    index,
    store,
} from '@/actions/App/Http/Controllers/SupplierController';
import SupplierForm from './supplier-form';
import { dashboard } from '@/routes';

export default function SupplierCreate() {
    return (
        <>
            <Head title="Tambah Supplier" />

            <SupplierForm
                action={store.form()}
                initial={{
                    name: '',
                    contact_person: '',
                    phone: '',
                    email: '',
                    address: '',
                    notes: '',
                    is_active: true,
                }}
                submitLabel="Simpan Supplier"
            />
        </>
    );
}

SupplierCreate.layout = {
    title: 'Tambah Supplier',
    description: 'Daftarkan pemasok barang baru.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Supplier',
            href: index(),
        },
        {
            title: 'Tambah',
        },
    ],
};
