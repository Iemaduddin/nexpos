import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
    create,
    destroy,
    edit,
    index,
} from '@/actions/App/Http/Controllers/CategoryController';
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
import type { Category, Paginated } from '@/types';

type Props = {
    categories: Paginated<Category>;
    filters: { search: string };
};

function IndexActions() {
    const { auth } = usePage().props;

    if (!auth.permissions.includes('products.manage')) {
        return null;
    }

    return (
        <Button asChild>
            <Link href={create()}>
                <Plus className="size-4" />
                Tambah Kategori
            </Link>
        </Button>
    );
}

export default function CategoryIndex({ categories, filters }: Props) {
    const { auth } = usePage().props;
    const canManage = auth.permissions.includes('products.manage');

    const [query, setQuery] = useState(filters.search ?? '');
    const [deleting, setDeleting] = useState<Category | null>(null);

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
            <Head title="Kategori" />

            <Card>
                <div className="flex items-center gap-2 border-b px-4 py-3">
                    <div className="relative w-full max-w-xs">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cari kategori..."
                            className="pl-9"
                            aria-label="Cari kategori"
                        />
                    </div>
                </div>

                {categories.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="px-4 py-2.5 font-medium">
                                        Nama
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Induk
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Produk
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
                                {categories.data.map((category) => (
                                    <tr
                                        key={category.id}
                                        className="border-b transition-colors last:border-0 hover:bg-muted/50"
                                    >
                                        <td className="px-4 py-3">
                                            <p className="font-medium">
                                                {category.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {category.slug}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {category.parent?.name ?? '–'}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {category.products_count ?? 0}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    category.is_active
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {category.is_active
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
                                                        aria-label={`Ubah ${category.name}`}
                                                    >
                                                        <Link
                                                            href={edit(
                                                                category.id,
                                                            )}
                                                        >
                                                            <Pencil className="size-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Hapus"
                                                        aria-label={`Hapus ${category.name}`}
                                                        onClick={() =>
                                                            setDeleting(
                                                                category,
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
                            icon={Package}
                            title={
                                filters.search
                                    ? 'Tidak ada hasil'
                                    : 'Belum ada kategori'
                            }
                            description={
                                filters.search
                                    ? `Tidak ditemukan kategori dengan kata kunci "${filters.search}".`
                                    : 'Tambahkan kategori pertama untuk mengelompokkan produk Anda.'
                            }
                            action={
                                !filters.search && canManage ? (
                                    <Button asChild>
                                        <Link href={create()}>
                                            <Plus className="size-4" />
                                            Tambah Kategori
                                        </Link>
                                    </Button>
                                ) : undefined
                            }
                        />
                    </CardContent>
                )}

                <div className="border-t">
                    <Pagination
                        from={categories.from}
                        to={categories.to}
                        total={categories.total}
                        currentPage={categories.current_page}
                        lastPage={categories.last_page}
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
                        <DialogTitle>Hapus kategori?</DialogTitle>
                        <DialogDescription>
                            Kategori "{deleting?.name}" akan dihapus permanen.
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

CategoryIndex.layout = {
    title: 'Kategori',
    description: 'Kelola kategori untuk mengelompokkan produk Anda.',
    actions: <IndexActions />,
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Kategori',
        },
    ],
};
