import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Building2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
    create,
    destroy,
    edit,
    index,
} from '@/actions/App/Http/Controllers/SupplierController';
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
import type { Paginated, Supplier } from '@/types';

type Props = {
    suppliers: Paginated<Supplier>;
    filters: { search: string };
};

function IndexActions() {
    const { auth } = usePage().props;

    if (!auth.permissions.includes('suppliers.manage')) {
        return null;
    }

    return (
        <Button asChild>
            <Link href={create()}>
                <Plus className="size-4" />
                Tambah Supplier
            </Link>
        </Button>
    );
}

export default function SupplierIndex({ suppliers, filters }: Props) {
    const { auth } = usePage().props;
    const canManage = auth.permissions.includes('suppliers.manage');

    const [query, setQuery] = useState(filters.search ?? '');
    const [deleting, setDeleting] = useState<Supplier | null>(null);

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
            <Head title="Supplier" />

            <Card>
                <div className="flex items-center gap-2 border-b px-4 py-3">
                    <div className="relative w-full max-w-xs">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cari nama / telepon..."
                            className="pl-9"
                            aria-label="Cari supplier"
                        />
                    </div>
                </div>

                {suppliers.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="px-4 py-2.5 font-medium">
                                        Nama
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Pembelian
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Status
                                    </th>
                                    {canManage && (
                                        <th className="px-4 py-2.5 text-right font-medium">
                                            Aksi
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.data.map((supplier) => (
                                    <tr
                                        key={supplier.id}
                                        className="border-b transition-colors last:border-0 hover:bg-muted/50"
                                    >
                                        <td className="px-4 py-3">
                                            <p className="font-medium">
                                                {supplier.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {supplier.contact_person ??
                                                    supplier.phone ??
                                                    supplier.code}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {supplier.purchases_count ?? 0}x
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    supplier.is_active
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {supplier.is_active
                                                    ? 'Aktif'
                                                    : 'Nonaktif'}
                                            </Badge>
                                        </td>
                                        {canManage && (
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        asChild
                                                        title="Ubah"
                                                        aria-label={`Ubah ${supplier.name}`}
                                                    >
                                                        <Link
                                                            href={edit(
                                                                supplier.id,
                                                            )}
                                                        >
                                                            <Pencil className="size-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Hapus"
                                                        aria-label={`Hapus ${supplier.name}`}
                                                        onClick={() =>
                                                            setDeleting(
                                                                supplier,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="size-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <CardContent className="p-0">
                        <EmptyState
                            icon={Building2}
                            title={
                                filters.search
                                    ? 'Tidak ada hasil'
                                    : 'Belum ada supplier'
                            }
                            description={
                                filters.search
                                    ? `Tidak ditemukan supplier dengan kata kunci "${filters.search}".`
                                    : 'Tambahkan supplier pertama Anda.'
                            }
                            action={
                                !filters.search && canManage ? (
                                    <Button asChild>
                                        <Link href={create()}>
                                            <Plus className="size-4" />
                                            Tambah Supplier
                                        </Link>
                                    </Button>
                                ) : undefined
                            }
                        />
                    </CardContent>
                )}

                <div className="border-t">
                    <Pagination
                        from={suppliers.from}
                        to={suppliers.to}
                        total={suppliers.total}
                        currentPage={suppliers.current_page}
                        lastPage={suppliers.last_page}
                        onPage={goToPage}
                    />
                </div>
            </Card>

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
                        <DialogTitle>Hapus supplier?</DialogTitle>
                        <DialogDescription>
                            Supplier "{deleting?.name}" akan dihapus permanen.
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

SupplierIndex.layout = {
    title: 'Supplier',
    description: 'Kelola pemasok barang untuk pembelian.',
    actions: <IndexActions />,
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Supplier',
        },
    ],
};
