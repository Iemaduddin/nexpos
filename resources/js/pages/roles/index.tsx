import { Form, Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
    destroy,
    index,
    store,
    update,
} from '@/actions/App/Http/Controllers/RoleController';
import EmptyState from '@/components/empty-state';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';

type Permission = {
    id: number;
    name: string;
};

type Role = {
    id: number;
    name: string;
    permissions: Permission[];
};

function RoleCreateDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Tambah Peran</DialogTitle>
                    <DialogDescription>
                        Buat peran baru, lalu atur izinnya.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    {...store.form()}
                    options={{ preserveScroll: true }}
                    onSuccess={() => onOpenChange(false)}
                    className="grid gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="role-name">Nama peran</Label>
                                <Input
                                    id="role-name"
                                    name="name"
                                    required
                                    autoFocus
                                    maxLength={50}
                                    placeholder="cth. supervisor"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Huruf kecil, tanpa spasi.
                                </p>
                                <InputError message={errors.name} />
                            </div>
                            <div className="flex items-center justify-end gap-2">
                                <DialogClose asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => onOpenChange(false)}
                                    >
                                        Batal
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Simpan Peran
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function RoleEditDialog({
    role,
    permissions,
    open,
    onOpenChange,
}: {
    role: Role;
    permissions: Permission[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const assignedPermissionIds = new Set(
        role.permissions.map((permission) => permission.id),
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="capitalize">
                        Kelola {role.name}
                    </DialogTitle>
                    <DialogDescription>
                        Pilih izin yang dapat digunakan oleh peran ini.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    {...update.form(role.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => onOpenChange(false)}
                    className="grid gap-3"
                >
                    {({ processing, errors }) => (
                        <>
                            {permissions.map((permission) => (
                                <div
                                    key={permission.id}
                                    className="flex items-center gap-3"
                                >
                                    <Checkbox
                                        id={`permission-${role.id}-${permission.id}`}
                                        name="permissions[]"
                                        value={String(permission.id)}
                                        defaultChecked={assignedPermissionIds.has(
                                            permission.id,
                                        )}
                                    />
                                    <Label
                                        htmlFor={`permission-${role.id}-${permission.id}`}
                                        className="font-normal"
                                    >
                                        {permission.name}
                                    </Label>
                                </div>
                            ))}
                            <InputError message={errors.permissions} />
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <DialogClose asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => onOpenChange(false)}
                                    >
                                        Batal
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Simpan Izin
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function IndexActions() {
    const [creating, setCreating] = useState(false);

    return (
        <>
            <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                Tambah Peran
            </Button>
            <RoleCreateDialog open={creating} onOpenChange={setCreating} />
        </>
    );
}

export default function RoleIndex({
    roles,
    permissions,
}: {
    roles: Role[];
    permissions: Permission[];
}) {
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<Role | null>(null);
    const [deleting, setDeleting] = useState<Role | null>(null);

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
            <Head title="Peran & Izin" />

            {roles.length === 0 ? (
                <EmptyState
                    icon={Pencil}
                    title="Belum ada peran"
                    description="Buat peran baru lalu atur izinnya."
                    action={
                        <Button onClick={() => setCreating(true)}>
                            <Plus className="size-4" />
                            Tambah Peran
                        </Button>
                    }
                />
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {roles.map((role) => (
                        <Card key={role.id}>
                            <CardHeader className="flex flex-row items-center justify-between gap-3">
                                <CardTitle className="capitalize">
                                    {role.name}
                                </CardTitle>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditing(role)}
                                    >
                                        <Pencil className="size-4" />
                                        Kelola
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Hapus peran"
                                        aria-label={`Hapus peran ${role.name}`}
                                        onClick={() => setDeleting(role)}
                                    >
                                        <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {role.permissions.length > 0 ? (
                                        role.permissions.map((permission) => (
                                            <Badge
                                                key={permission.id}
                                                variant="secondary"
                                            >
                                                {permission.name}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            Belum ada izin.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <RoleCreateDialog open={creating} onOpenChange={setCreating} />

            {editing && (
                <RoleEditDialog
                    role={editing}
                    permissions={permissions}
                    open={editing !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEditing(null);
                        }
                    }}
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
                        <DialogTitle>Hapus peran?</DialogTitle>
                        <DialogDescription>
                            Peran "{deleting?.name}" akan dihapus permanen.
                            Peran yang masih dipakai pengguna tidak dapat
                            dihapus.
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

RoleIndex.layout = {
    title: 'Peran & Izin',
    description: 'Kelola akses pengguna berdasarkan peran.',
    actions: <IndexActions />,
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Peran & Izin',
        },
    ],
};
