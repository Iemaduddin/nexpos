import { Head } from '@inertiajs/react';
import { index, store } from '@/actions/App/Http/Controllers/UnitController';
import UnitForm from './unit-form';
import { dashboard } from '@/routes';

export default function UnitCreate() {
    return (
        <>
            <Head title="Tambah Satuan" />

            <UnitForm
                action={store.form()}
                initial={{ name: '', symbol: '', is_active: true }}
                submitLabel="Simpan Satuan"
            />
        </>
    );
}

UnitCreate.layout = {
    title: 'Tambah Satuan',
    description: 'Buat satuan produk baru.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Satuan',
            href: index(),
        },
        {
            title: 'Tambah',
        },
    ],
};
