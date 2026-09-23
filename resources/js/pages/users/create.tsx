import { Head } from '@inertiajs/react';
import { index, store } from '@/actions/App/Http/Controllers/UserController';
import UserForm from './user-form';
import { dashboard } from '@/routes';
import type { RoleOption, StoreOption } from '@/types';

export default function UserCreate({
    roles,
    stores,
}: {
    roles: RoleOption[];
    stores: StoreOption[];
}) {
    return (
        <>
            <Head title="Tambah Pengguna" />

            <UserForm
                action={store.form()}
                initial={{
                    name: '',
                    email: '',
                    role: '',
                    store_id: '',
                    is_active: true,
                }}
                roles={roles}
                stores={stores}
                submitLabel="Simpan Pengguna"
                passwordRequired={true}
            />
        </>
    );
}

UserCreate.layout = {
    title: 'Tambah Pengguna',
    description: 'Daftarkan pengguna baru untuk mengakses sistem.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Pengguna',
            href: index(),
        },
        {
            title: 'Tambah',
        },
    ],
};