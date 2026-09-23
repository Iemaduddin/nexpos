import { Head } from '@inertiajs/react';
import {
    index,
    update,
} from '@/actions/App/Http/Controllers/CustomerController';
import CustomerForm from './customer-form';
import { dashboard } from '@/routes';
import type { Customer } from '@/types';

export default function CustomerEdit({ customer }: { customer: Customer }) {
    return (
        <>
            <Head title={`Ubah ${customer.name}`} />

            <CustomerForm
                action={update.form(customer.id)}
                initial={{
                    name: customer.name,
                    phone: customer.phone ?? '',
                    email: customer.email ?? '',
                    address: customer.address ?? '',
                    birthdate: customer.birthdate?.slice(0, 10) ?? '',
                    is_active: customer.is_active,
                }}
                submitLabel="Simpan Perubahan"
            />
        </>
    );
}

CustomerEdit.layout = {
    title: 'Ubah Pelanggan',
    description: 'Perbarui data pelanggan yang sudah ada.',
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
            title: 'Ubah',
        },
    ],
};
