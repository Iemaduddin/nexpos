import { Head } from '@inertiajs/react';
import {
    index,
    update,
} from '@/actions/App/Http/Controllers/CategoryController';
import CategoryForm from './category-form';
import { dashboard } from '@/routes';
import type { Category, CategoryParentOption } from '@/types';

export default function CategoryEdit({
    category,
    parents,
}: {
    category: Category;
    parents: CategoryParentOption[];
}) {
    return (
        <>
            <Head title={`Ubah ${category.name}`} />

            <CategoryForm
                action={update.form(category.id)}
                initial={{
                    name: category.name,
                    slug: category.slug,
                    parent_id: category.parent_id?.toString() ?? '',
                    description: category.description ?? '',
                    is_active: category.is_active,
                }}
                parents={parents}
                submitLabel="Simpan Perubahan"
            />
        </>
    );
}

CategoryEdit.layout = {
    title: 'Ubah Kategori',
    description: 'Perbarui data kategori yang sudah ada.',
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
            title: 'Ubah',
        },
    ],
};
