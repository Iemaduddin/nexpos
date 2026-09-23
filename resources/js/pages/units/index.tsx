import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Pencil, Plus, Ruler, Search, Trash2 } from 'lucide-react';
import {
    create,
    destroy,
    edit,
    index,
} from '@/actions/App/Http/Controllers/UnitController';
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
import type { Paginated, Unit } from '@/types';

type Props = {
    units: Paginated<Unit>;
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
                Tambah Satuan
            </Link>
        </Button>
    );
}

export default function UnitIndex({ units, filters }: Props) {
    const { auth } = usePage().props;
    const canManage = auth.permissions.includes('products.manage');

    const [query, setQuery] = useState(filters.search ?? '');
    const [deleting, setDeleting] = useState<Unit | null>(null);

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
            <Head title="Satuan" />

            <Card>
                <div className="flex items-center gap-2 border-b px-4 py-3">
                    <div className="relative w-full max-w-xs">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Cari satuan..."
                            className="pl-9"
                            aria-label="Cari satuan"
                        />
                    </div>
                </div>

                {units.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="px-4 py-2.5 font-medium">
                                        Nama
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Simbol
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
                                {units.data.map((unit) => (
                                    <tr
                                        key={unit.id}
                                        className="border-b transition-colors last:border-0 hover:bg-muted/50"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            {unit.name}
                                        </td>
                                        <td className="px-4 py-3">
                                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                                {unit.symbol}
                                            </code>
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {unit.products_count ?? 0}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    unit.is_active
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {unit.is_active
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
                                                        aria-label={`Ubah ${unit.name}`}
                                                    >
                                                        <Link
                                                            href={edit(unit.id)}
                                                        >
                                                            <Pencil className="size-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Hapus"
                                                        aria-label={`Hapus ${unit.name}`}
                                                        onClick={() =>
                                                            setDeleting(unit)
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
                            icon={Ruler}
                            title={
                                filters.search
                                    ? 'Tidak ada hasil'
                                    : 'Belum ada satuan'
                            }
                            description={
                                filters.search
                                    ? `Tidak ditemukan satuan dengan kata kunci "${filters.search}".`
                                    : 'Tambahkan satuan pertama untuk melengkapi data produk Anda.'
                            }
                            action={
                                !filters.search && canManage ? (
                                    <Button asChild>
                                        <Link href={create()}>
                                            <Plus className="size-4" />
                                            Tambah Satuan
                                        </Link>
                                    </Button>
                                ) : undefined
                            }
                        />
                    </CardContent>
                )}

                <div className="border-t">
                    <Pagination
                        from={units.from}
                        to={units.to}
                        total={units.total}
                        currentPage={units.current_page}
                        lastPage={units.last_page}
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
                        <DialogTitle>Hapus satuan?</DialogTitle>
                        <DialogDescription>
                            Satuan "{deleting?.name}" akan dihapus permanen.
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

UnitIndex.layout = {
    title: 'Satuan',
    description: 'Kelola satuan produk seperti pcs, kg, dan liter.',
    actions: <IndexActions />,
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Satuan',
        },
    ],
};
