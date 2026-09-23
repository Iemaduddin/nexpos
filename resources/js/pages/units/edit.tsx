import { Head } from '@inertiajs/react';
import { index, update } from '@/actions/App/Http/Controllers/UnitController';
import UnitForm from './unit-form';
import { dashboard } from '@/routes';
import type { Unit } from '@/types';

export default function UnitEdit({ unit }: { unit: Unit }) {
    return (
        <>
            <Head title={`Ubah ${unit.name}`} />

            <UnitForm
                action={update.form(unit.id)}
                initial={{
                    name: unit.name,
                    symbol: unit.symbol,
                    is_active: unit.is_active,
                }}
                submitLabel="Simpan Perubahan"
            />
        </>
    );
}

UnitEdit.layout = {
    title: 'Ubah Satuan',
    description: 'Perbarui data satuan yang sudah ada.',
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
            title: 'Ubah',
        },
    ],
};
