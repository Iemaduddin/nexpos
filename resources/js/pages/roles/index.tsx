import { Head, Link } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { edit } from '@/actions/App/Http/Controllers/RoleController';
import EmptyState from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function RoleIndex({ roles }: { roles: Role[] }) {
    return (
        <>
            <Head title="Peran & Izin" />

            {roles.length === 0 ? (
                <EmptyState
                    icon={Pencil}
                    title="Belum ada peran"
                    description="Belum ada peran yang tersedia untuk dikonfigurasi."
                />
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {roles.map((role) => (
                        <Card key={role.id}>
                            <CardHeader className="flex flex-row items-center justify-between gap-3">
                                <CardTitle className="capitalize">
                                    {role.name}
                                </CardTitle>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={edit(role.id)}>
                                        <Pencil className="size-4" />
                                        Kelola
                                    </Link>
                                </Button>
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
        </>
    );
}

RoleIndex.layout = {
    title: 'Peran & Izin',
    description: 'Kelola akses pengguna berdasarkan peran.',
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
