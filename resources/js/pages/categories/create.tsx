import { Head } from '@inertiajs/react';
import {
    index,
    store,
} from '@/actions/App/Http/Controllers/CategoryController';
import CategoryForm from './category-form';
import { dashboard } from '@/routes';
import type { CategoryParentOption } from '@/types';

export default function CategoryCreate({
    parents,
}: {
    parents: CategoryParentOption[];
}) {
    return (
        <>
            <Head title="Tambah Kategori" />

            <CategoryForm
                action={store.form()}
                initial={{
                    name: '',
                    slug: '',
                    parent_id: '',
                    description: '',
                    is_active: true,
                }}
                parents={parents}
                submitLabel="Simpan Kategori"
            />
        </>
    );
}

CategoryCreate.layout = {
    title: 'Tambah Kategori',
    description: 'Buat kategori baru untuk mengelompokkan produk.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Kategori',
            href: index(),
        },
        {
            title: 'Tambah',
        },
    ],
};
