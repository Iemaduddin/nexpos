import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Pencil, Plus, Search, Store as StoreIcon, Trash2 } from 'lucide-react';
import {
    create,
    destroy,
    edit,
    index,
} from '@/actions/App/Http/Controllers/StoreController';
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
import type { Paginated, Store } from '@/types';

type Props = {
    stores: Paginated<Store>;
    filters: { search: string };
};

function IndexActions() {
    const { auth } = usePage().props;

    if (!auth.permissions.includes('settings.manage')) {
        return null;
    }

    return (
        <Button asChild>
            <Link href={create()}>
                <Plus className="size-4" />
                Tambah Gerai
            </Link>
        </Button>
    );
}

export default function StoreIndex({ stores, filters }: Props) {
    const [query, setQuery] = useState(filters.search ?? '');
    const [deleting, setDeleting] = useState<Store | null>(null);

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
            <Head title="Gerai" />

            <Card>
                <div className="flex items-center gap-2 border-b px-4 py-3">
                    <div className="relative w-full max-w-xs">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cari nama / kode..."
                            className="pl-9"
                            aria-label="Cari gerai"
                        />
                    </div>
                </div>

                {stores.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="px-4 py-2.5 font-medium">
                                        Gerai
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Pengguna
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
                                {stores.data.map((store) => (
                                    <tr
                                        key={store.id}
                                        className="border-b transition-colors last:border-0 hover:bg-muted/50"
                                    >
                                        <td className="px-4 py-3">
                                            <p className="font-medium">
                                                {store.name}{' '}
                                                {store.is_main && (
                                                    <Badge
                                                        variant="outline"
                                                        className="ml-1"
                                                    >
                                                        Utama
                                                    </Badge>
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {store.code}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {store.users_count ?? 0} pengguna ·{' '}
                                            {store.sales_count ?? 0} transaksi
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    store.is_active
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {store.is_active
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
                                                    title="Ubah"
                                                    aria-label={`Ubah ${store.name}`}
                                                >
                                                    <Link
                                                        href={edit(store.id)}
                                                    >
                                                        <Pencil className="size-4" />
                                                    </Link>
                                                </Button>
                                                {!store.is_main && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Hapus"
                                                        aria-label={`Hapus ${store.name}`}
                                                        onClick={() =>
                                                            setDeleting(store)
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
                            icon={StoreIcon}
                            title={
                                filters.search
                                    ? 'Tidak ada hasil'
                                    : 'Belum ada gerai'
                            }
                            description={
                                filters.search
                                    ? `Tidak ditemukan gerai dengan kata kunci "${filters.search}".`
                                    : 'Tambahkan gerai atau cabang baru.'
                            }
                            action={
                                !filters.search ? (
                                    <Button asChild>
                                        <Link href={create()}>
                                            <Plus className="size-4" />
                                            Tambah Gerai
                                        </Link>
                                    </Button>
                                ) : undefined
                            }
                        />
                    </CardContent>
                )}

                <div className="border-t">
                    <Pagination
                        from={stores.from}
                        to={stores.to}
                        total={stores.total}
                        currentPage={stores.current_page}
                        lastPage={stores.last_page}
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
                        <DialogTitle>Hapus gerai?</DialogTitle>
                        <DialogDescription>
                            Gerai "{deleting?.name}" akan dihapus permanen.
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

StoreIndex.layout = {
    title: 'Gerai',
    description: 'Kelola toko dan cabang usaha Anda.',
    actions: <IndexActions />,
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Gerai',
        },
    ],
};
