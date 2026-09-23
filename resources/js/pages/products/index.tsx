import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    Package,
    Pencil,
    Plus,
    Search,
    Trash2,
    TriangleAlert,
} from 'lucide-react';
import {
    create,
    destroy,
    edit,
    index,
} from '@/actions/App/Http/Controllers/ProductController';
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
import { formatIDR, formatQty } from '@/lib/format';
import { dashboard } from '@/routes';
import type { OptionItem, Paginated, Product } from '@/types';

type Props = {
    products: Paginated<Product>;
    filters: { search: string; category_id: number | null };
    categories: OptionItem[];
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
                Tambah Produk
            </Link>
        </Button>
    );
}

export default function ProductIndex({ products, filters, categories }: Props) {
    const { auth } = usePage().props;
    const canManage = auth.permissions.includes('products.manage');

    const [query, setQuery] = useState(filters.search ?? '');
    const [deleting, setDeleting] = useState<Product | null>(null);

    useEffect(() => {
        if (query === (filters.search ?? '')) {
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                index.url({
                    query: {
                        ...(query ? { search: query } : {}),
                        ...(filters.category_id
                            ? { category_id: filters.category_id }
                            : {}),
                    },
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
    }, [query, filters.search, filters.category_id]);

    function navigate(params: Record<string, string | number>) {
        router.get(
            index.url({ query: params }),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    function changeCategory(categoryId: string) {
        navigate({
            ...(query ? { search: query } : {}),
            ...(categoryId ? { category_id: Number(categoryId) } : {}),
        });
    }

    function goToPage(page: number) {
        navigate({
            ...(query ? { search: query } : {}),
            ...(filters.category_id
                ? { category_id: filters.category_id }
                : {}),
            ...(page > 1 ? { page } : {}),
        });
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
            <Head title="Produk" />

            <Card>
                <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
                    <div className="relative w-full max-w-xs">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cari nama, SKU, barcode..."
                            className="pl-9"
                            aria-label="Cari produk"
                        />
                    </div>
                    <select
                        value={filters.category_id?.toString() ?? ''}
                        onChange={(e) => changeCategory(e.target.value)}
                        aria-label="Saring kategori"
                        className="flex h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                        <option value="">Semua kategori</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                {products.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="px-4 py-2.5 font-medium">
                                        Produk
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Kategori
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Harga Jual
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Stok
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
                                {products.data.map((product) => {
                                    const stock = product.stock ?? 0;
                                    const lowStock =
                                        product.track_inventory &&
                                        stock <= product.low_stock_threshold;

                                    return (
                                        <tr
                                            key={product.id}
                                            className="border-b transition-colors last:border-0 hover:bg-muted/50"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {product.image_path ? (
                                                        <img
                                                            src={`/storage/${product.image_path}`}
                                                            alt={product.name}
                                                            className="size-10 shrink-0 rounded-md border object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted/50">
                                                            <Package className="size-4 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium">
                                                            {product.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {product.sku}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {product.category?.name ?? '–'}
                                            </td>
                                            <td className="px-4 py-3 tabular-nums">
                                                {formatIDR(
                                                    product.selling_price,
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="tabular-nums">
                                                    {product.track_inventory
                                                        ? formatQty(stock)
                                                        : '–'}
                                                </p>
                                                {lowStock && (
                                                    <p className="flex items-center gap-1 text-xs text-amber-600">
                                                        <TriangleAlert className="size-3" />
                                                        Menipis
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    variant={
                                                        product.is_active
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {product.is_active
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
                                                            aria-label={`Ubah ${product.name}`}
                                                        >
                                                            <Link
                                                                href={edit(
                                                                    product.id,
                                                                )}
                                                            >
                                                                <Pencil className="size-4" />
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Hapus"
                                                            aria-label={`Hapus ${product.name}`}
                                                            onClick={() =>
                                                                setDeleting(
                                                                    product,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 className="size-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <CardContent className="p-0">
                        <EmptyState
                            icon={Package}
                            title={
                                filters.search || filters.category_id
                                    ? 'Tidak ada hasil'
                                    : 'Belum ada produk'
                            }
                            description={
                                filters.search || filters.category_id
                                    ? 'Coba kata kunci atau kategori lain.'
                                    : 'Tambahkan produk pertama untuk mulai berjualan.'
                            }
                            action={
                                !filters.search &&
                                !filters.category_id &&
                                canManage ? (
                                    <Button asChild>
                                        <Link href={create()}>
                                            <Plus className="size-4" />
                                            Tambah Produk
                                        </Link>
                                    </Button>
                                ) : undefined
                            }
                        />
                    </CardContent>
                )}

                <div className="border-t">
                    <Pagination
                        from={products.from}
                        to={products.to}
                        total={products.total}
                        currentPage={products.current_page}
                        lastPage={products.last_page}
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
                        <DialogTitle>Hapus produk?</DialogTitle>
                        <DialogDescription>
                            Produk "{deleting?.name}" beserta variannya akan
                            dihapus permanen. Tindakan ini tidak dapat
                            dibatalkan.
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

ProductIndex.layout = {
    title: 'Produk',
    description: 'Kelola katalog produk, harga, dan varian.',
    actions: <IndexActions />,
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Produk',
        },
    ],
};
