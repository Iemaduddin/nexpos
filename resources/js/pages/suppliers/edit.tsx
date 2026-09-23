import { Head } from '@inertiajs/react';
import {
    index,
    update,
} from '@/actions/App/Http/Controllers/SupplierController';
import SupplierForm from './supplier-form';
import { dashboard } from '@/routes';
import type { Supplier } from '@/types';

export default function SupplierEdit({ supplier }: { supplier: Supplier }) {
    return (
        <>
            <Head title={`Ubah ${supplier.name}`} />

            <SupplierForm
                action={update.form(supplier.id)}
                initial={{
                    name: supplier.name,
                    contact_person: supplier.contact_person ?? '',
                    phone: supplier.phone ?? '',
                    email: supplier.email ?? '',
                    address: supplier.address ?? '',
                    notes: supplier.notes ?? '',
                    is_active: supplier.is_active,
                }}
                submitLabel="Simpan Perubahan"
            />
        </>
    );
}

SupplierEdit.layout = {
    title: 'Ubah Supplier',
    description: 'Perbarui data supplier yang sudah ada.',
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
            title: 'Ubah',
        },
    ],
};
