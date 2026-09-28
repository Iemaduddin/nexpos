import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Eye, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import {
    destroy,
    index,
    show,
} from '@/actions/App/Http/Controllers/CustomerController';
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
import { formatIDR } from '@/lib/format';
import { dashboard } from '@/routes';
import type { Customer, Paginated } from '@/types';
import { CustomerCreateDialog, CustomerEditDialog } from './customer-form';

type Props = {
    customers: Paginated<Customer>;
    filters: { search: string };
};

function IndexActions() {
    const { auth } = usePage().props;
    const [creating, setCreating] = useState(false);

    if (!auth.permissions.includes('customers.manage')) {
        return null;
    }

    return (
        <>
            <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                Tambah Pelanggan
            </Button>
            <CustomerCreateDialog
                open={creating}
                onOpenChange={setCreating}
            />
        </>
    );
}

export default function CustomerIndex({ customers, filters }: Props) {
    const { auth } = usePage().props;
    const canManage = auth.permissions.includes('customers.manage');

    const [query, setQuery] = useState(filters.search ?? '');
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<Customer | null>(null);
    const [deleting, setDeleting] = useState<Customer | null>(null);

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
            <Head title="Pelanggan" />

            <Card>
                <div className="flex items-center gap-2 border-b px-4 py-3">
                    <div className="relative w-full max-w-xs">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cari nama / telepon..."
                            className="pl-9"
                            aria-label="Cari pelanggan"
                        />
                    </div>
                </div>

                {customers.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="px-4 py-2.5 font-medium">
                                        Nama
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Transaksi
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Total Belanja
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
                                {customers.data.map((customer) => (
                                    <tr
                                        key={customer.id}
                                        className="border-b transition-colors last:border-0 hover:bg-muted/50"
                                    >
                                        <td className="px-4 py-3">
                                            <p className="font-medium">
                                                {customer.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {customer.phone ??
                                                    customer.code}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {customer.transaction_count}x
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {formatIDR(customer.total_spent)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    customer.is_active
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {customer.is_active
                                                    ? 'Aktif'
                                                    : 'Nonaktif'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    title="Detail"
                                                    aria-label={`Detail ${customer.name}`}
                                                >
                                                    <Link
                                                        href={show(
                                                            customer.id,
                                                        )}
                                                    >
                                                        <Eye className="size-4" />
                                                    </Link>
                                                </Button>
                                                {canManage && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Ubah"
                                                        aria-label={`Ubah ${customer.name}`}
                                                        onClick={() =>
                                                            setEditing(customer)
                                                        }
                                                    >
                                                        <Pencil className="size-4" />
                                                    </Button>
                                                )}
                                                {canManage && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Hapus"
                                                        aria-label={`Hapus ${customer.name}`}
                                                        onClick={() =>
                                                            setDeleting(
                                                                customer,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="size-4 text-destructive" />
                                                    </Button>
                                                )}
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
                                    : 'Belum ada pelanggan'
                            }
                            description={
                                filters.search
                                    ? `Tidak ditemukan pelanggan dengan kata kunci "${filters.search}".`
                                    : 'Tambahkan pelanggan pertama Anda.'
                            }
                            action={
                                !filters.search && canManage ? (
                                    <Button
                                        onClick={() => setCreating(true)}
                                    >
                                        <Plus className="size-4" />
                                        Tambah Pelanggan
                                    </Button>
                                ) : undefined
                            }
                        />
                    </CardContent>
                )}

                <div className="border-t">
                    <Pagination
                        from={customers.from}
                        to={customers.to}
                        total={customers.total}
                        currentPage={customers.current_page}
                        lastPage={customers.last_page}
                        onPage={goToPage}
                    />
                </div>
            </Card>

            <CustomerCreateDialog
                open={creating}
                onOpenChange={setCreating}
            />

            {editing && (
                <CustomerEditDialog
                    customer={editing}
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
                        <DialogTitle>Hapus pelanggan?</DialogTitle>
                        <DialogDescription>
                            Pelanggan "{deleting?.name}" akan dihapus permanen.
                            Tindakan ini tidak dapat dibatalkan.
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

CustomerIndex.layout = {
    title: 'Pelanggan',
    description: 'Kelola data pelanggan dan riwayat belanjanya.',
    actions: <IndexActions />,
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Pelanggan',
        },
    ],
};
