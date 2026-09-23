import { Head } from '@inertiajs/react';
import { index, update } from '@/actions/App/Http/Controllers/UserController';
import UserForm from './user-form';
import { dashboard } from '@/routes';
import type { RoleOption, StoreOption } from '@/types';

export default function UserEdit({ user, roles, stores }: {
    user: {
        id: number;
        name: string;
        email: string;
        store_id: number | null;
        is_active: boolean;
        roles: { name: string }[];
    };
    roles: RoleOption[];
    stores: StoreOption[];
}) {
    return (
        <>
            <Head title={`Ubah ${user.name}`} />

            <UserForm
                action={update.form(user.id)}
                initial={{
                    name: user.name,
                    email: user.email,
                    role: user.roles?.[0]?.name ?? '',
                    store_id: user.store_id?.toString() ?? '',
                    is_active: user.is_active,
                }}
                roles={roles}
                stores={stores}
                submitLabel="Simpan Perubahan"
                passwordRequired={false}
            />
        </>
    );
}

UserEdit.layout = {
    title: 'Ubah Pengguna',
    description: 'Perbarui data pengguna yang sudah ada.',
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
            title: 'Ubah',
        },
    ],
};