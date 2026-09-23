import { Head } from '@inertiajs/react';
import { index, update } from '@/actions/App/Http/Controllers/BrandController';
import BrandForm from './brand-form';
import { dashboard } from '@/routes';
import type { Brand } from '@/types';

export default function BrandEdit({ brand }: { brand: Brand }) {
    return (
        <>
            <Head title={`Ubah ${brand.name}`} />

            <BrandForm
                action={update.form(brand.id)}
                initial={{
                    name: brand.name,
                    slug: brand.slug,
                    description: brand.description ?? '',
                    is_active: brand.is_active,
                }}
                submitLabel="Simpan Perubahan"
            />
        </>
    );
}

BrandEdit.layout = {
    title: 'Ubah Brand',
    description: 'Perbarui data brand yang sudah ada.',
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
            title: 'Ubah',
        },
    ],
};
