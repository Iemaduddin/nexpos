import { Head } from '@inertiajs/react';
import { index, store } from '@/actions/App/Http/Controllers/BrandController';
import BrandForm from './brand-form';
import { dashboard } from '@/routes';

export default function BrandCreate() {
    return (
        <>
            <Head title="Tambah Brand" />

            <BrandForm
                action={store.form()}
                initial={{
                    name: '',
                    slug: '',
                    description: '',
                    is_active: true,
                }}
                submitLabel="Simpan Brand"
            />
        </>
    );
}

BrandCreate.layout = {
    title: 'Tambah Brand',
    description: 'Buat brand atau merek produk baru.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Brand',
            href: index(),
        },
        {
            title: 'Tambah',
        },
    ],
};
