import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { update } from '@/actions/App/Http/Controllers/RoleController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { index } from '@/routes/roles';

type Permission = {
    id: number;
    name: string;
};

type Role = {
    id: number;
    name: string;
    permissions: Permission[];
};

export default function RoleEdit({
    role,
    permissions,
}: {
    role: Role;
    permissions: Permission[];
}) {
    const assignedPermissionIds = new Set(
        role.permissions.map((permission) => permission.id),
    );

    return (
        <>
            <Head title={`Peran ${role.name}`} />

            <Card>
                <CardContent className="pt-6">
                    <Form
                        {...update.form(role.id)}
                        options={{ preserveScroll: true }}
                        className="grid max-w-xl gap-6"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-1">
                                    <h2 className="text-lg font-semibold capitalize">
                                        {role.name}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Pilih izin yang dapat digunakan oleh role
                                        ini.
                                    </p>
                                </div>

                                <div className="grid gap-3">
                                    {permissions.map((permission) => (
                                        <div
                                            key={permission.id}
                                            className="flex items-center gap-3"
                                        >
                                            <Checkbox
                                                id={`permission-${permission.id}`}
                                                name="permissions[]"
                                                value={String(permission.id)}
                                                defaultChecked={assignedPermissionIds.has(
                                                    permission.id,
                                                )}
                                            />
                                            <Label
                                                htmlFor={`permission-${permission.id}`}
                                                className="font-normal"
                                            >
                                                {permission.name}
                                            </Label>
                                        </div>
                                    ))}
                                </div>

                                <InputError message={errors.permissions} />

                                <div className="flex items-center gap-2">
                                    <Button type="submit" disabled={processing}>
                                        {processing && <Spinner />}
                                        Simpan Izin
                                    </Button>
                                    <Button variant="outline" asChild>
                                        <Link href={index()}>
                                            <ArrowLeft className="size-4" />
                                            Kembali
                                        </Link>
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </CardContent>
            </Card>
        </>
    );
}

RoleEdit.layout = {
    title: 'Peran & Izin',
    description: 'Atur permission untuk role pengguna.',
    breadcrumbs: [
        {
            title: 'Peran & Izin',
            href: index(),
        },
        {
            title: 'Ubah',
        },
    ],
};
