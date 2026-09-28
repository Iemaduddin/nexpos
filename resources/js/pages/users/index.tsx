import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import {
    destroy,
    index,
} from '@/actions/App/Http/Controllers/UserController';
import EmptyState from '@/components/empty-state';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { dashboard } from '@/routes';
import { index as rolesIndex } from '@/routes/roles';
import type {
    ManagedUser,
    Paginated,
    RoleOption,
    StoreOption,
} from '@/types';
import { UserCreateDialog, UserEditDialog } from './user-form';

type Props = {
    users: Paginated<ManagedUser>;
    filters: { search: string };
    roles: RoleOption[];
    stores: StoreOption[];
};

function useFormOptions(): { roles: RoleOption[]; stores: StoreOption[] } {
    const { roles, stores } = usePage().props as unknown as {
        roles: RoleOption[];
        stores: StoreOption[];
    };
    return { roles: roles ?? [], stores: stores ?? [] };
}

function UserIndexActions() {
    const [creating, setCreating] = useState(false);
    const { roles, stores } = useFormOptions();

    return (
        <>
            <Button variant="outline" asChild>
                <Link href={rolesIndex()}>Peran & Izin</Link>
            </Button>
            <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                Tambah Pengguna
            </Button>
            <UserCreateDialog
                open={creating}
                onOpenChange={setCreating}
                roles={roles}
                stores={stores}
            />
        </>
    );
}

export default function UserIndex({ users, filters }: Props) {
    const [query, setQuery] = useState(filters.search ?? '');
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<ManagedUser | null>(null);
    const [deleting, setDeleting] = useState<ManagedUser | null>(null);
    const { roles, stores } = useFormOptions();

    useEffect(() => {
        if (query === (filters.search ?? '')) {
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                index.url({
                    query: query ? { search: query } : {},
                }),
                {},
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        }, 400);

        return () => clearTimeout(timer);
    }, [query, filters.search]);

    function goToPage(page: number) {
        router.get(
            index.url({
                query: {
                    ...(query ? { search: query } : {}),
                    ...(page > 1 ? { page } : {}),
                },
            }),
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function confirmDelete() {
        if (!deleting) {
            return;
        }

        router.delete(destroy(deleting.id).url, {
            preserveScroll: true,
            onSuccess: () => setDeleting(null),
        });
    }

    return (
        <>
            <Head title="Pengguna" />

            <Card>
                <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
                    <div className="relative w-full max-w-xs">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cari nama / email..."
                            className="pl-9"
                            aria-label="Cari pengguna"
                        />
                    </div>
                </div>

                {users.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="px-4 py-2.5 font-medium">
                                        Nama
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Peran
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Gerai
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Status
                                    </th>
                                    <th className="px-4 py-2.5 text-right font-medium">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.data.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="border-b transition-colors last:border-0 hover:bg-muted/50"
                                    >
                                        <td className="px-4 py-3">
                                            <p className="font-medium">
                                                {user.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline">
                                                {user.roles?.[0]?.name ?? '–'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {user.store?.name ?? 'Semua'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    user.is_active
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {user.is_active
                                                    ? 'Aktif'
                                                    : 'Nonaktif'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Ubah"
                                                    aria-label={`Ubah ${user.name}`}
                                                    onClick={() =>
                                                        setEditing(user)
                                                    }
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Hapus"
                                                    aria-label={`Hapus ${user.name}`}
                                                    onClick={() =>
                                                        setDeleting(user)
                                                    }
                                                >
                                                    <Trash2 className="size-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <CardContent className="p-0">
                        <EmptyState
                            icon={Users}
                            title={
                                filters.search
                                    ? 'Tidak ada hasil'
                                    : 'Belum ada pengguna'
                            }
                            description={
                                filters.search
                                    ? `Tidak ditemukan pengguna dengan kata kunci "${filters.search}".`
                                    : 'Tambahkan akun kasir atau manager.'
                            }
                            action={
                                !filters.search ? (
                                    <Button
                                        onClick={() => setCreating(true)}
                                    >
                                        <Plus className="size-4" />
                                        Tambah Pengguna
                                    </Button>
                                ) : undefined
                            }
                        />
                    </CardContent>
                )}

                <div className="border-t">
                    <Pagination
                        from={users.from}
                        to={users.to}
                        total={users.total}
                        currentPage={users.current_page}
                        lastPage={users.last_page}
                        onPage={goToPage}
                    />
                </div>
            </Card>

            <UserCreateDialog
                open={creating}
                onOpenChange={setCreating}
                roles={roles}
                stores={stores}
            />

            {editing && (
                <UserEditDialog
                    user={editing}
                    open={editing !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditing(null);
                        }
                    }}
                    roles={roles}
                    stores={stores}
                />
            )}

            <Dialog
                open={deleting !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleting(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus pengguna?</DialogTitle>
                        <DialogDescription>
                            Akun "{deleting?.name}" akan dihapus permanen dan
                            tidak bisa masuk lagi.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button
                                variant="outline"
                                onClick={() => setDeleting(null)}
                            >
                                Batal
                            </Button>
                        </DialogClose>
                        <Button variant="destructive" onClick={confirmDelete}>
                            Ya, hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

UserIndex.layout = {
    title: 'Pengguna',
    description: 'Kelola akun, peran, dan penempatan gerai.',
    actions: <UserIndexActions />,
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Pengguna',
        },
    ],
};
