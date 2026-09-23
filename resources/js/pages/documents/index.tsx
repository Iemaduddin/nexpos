import { Head, Link, router, usePage } from '@inertiajs/react';
import { Eye, FileScan, Plus } from 'lucide-react';
import {
    create,
    index,
    show,
} from '@/actions/App/Http/Controllers/DocumentController';
import EmptyState from '@/components/empty-state';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { dashboard } from '@/routes';
import type { Document, Paginated } from '@/types';

const statusLabel: Record<string, string> = {
    uploaded: 'Diunggah',
    processing: 'Diproses',
    processed: 'Siap verifikasi',
    failed: 'Gagal',
    verified: 'Terverifikasi',
};

function IndexActions() {
    const { auth } = usePage().props;

    if (!auth.permissions.includes('inventory.purchase')) {
        return null;
    }

    return (
        <Button asChild>
            <Link href={create()}>
                <Plus className="size-4" />
                Unggah Faktur
            </Link>
        </Button>
    );
}

export default function DocumentIndex({
    documents,
}: {
    documents: Paginated<Document>;
}) {
    function goToPage(page: number) {
        router.get(
            index.url({ query: page > 1 ? { page } : {} }),
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Dokumen" />

            <Card>
                {documents.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="px-4 py-2.5 font-medium">
                                        Dokumen
                                    </th>
                                    <th className="px-4 py-2.5 font-medium">
                                        Supplier
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
                                {documents.data.map((document) => (
                                    <tr
                                        key={document.id}
                                        className="border-b transition-colors last:border-0 hover:bg-muted/50"
                                    >
                                        <td className="px-4 py-3">
                                            <Link
                                                href={show(document.id)}
                                                className="font-medium hover:underline"
                                            >
                                                Faktur #{document.id}
                                            </Link>
                                            <p className="text-xs text-muted-foreground">
                                                {new Intl.DateTimeFormat(
                                                    'id-ID',
                                                    {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    },
                                                ).format(
                                                    new Date(
                                                        document.created_at,
                                                    ),
                                                )}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {document.supplier?.name ?? '–'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={
                                                    document.status ===
                                                    'verified'
                                                        ? 'default'
                                                        : document.status ===
                                                            'failed'
                                                          ? 'destructive'
                                                          : 'secondary'
                                                }
                                            >
                                                {statusLabel[document.status] ??
                                                    document.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                    title="Lihat detail"
                                                    aria-label={`Lihat dokumen ${document.id}`}
                                                >
                                                    <Link
                                                        href={show(document.id)}
                                                    >
                                                        <Eye className="size-4" />
                                                    </Link>
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
                            icon={FileScan}
                            title="Belum ada dokumen"
                            description="Unggah foto faktur supplier untuk diekstrak otomatis."
                            action={<IndexActions />}
                        />
                    </CardContent>
                )}

                <div className="border-t">
                    <Pagination
                        from={documents.from}
                        to={documents.to}
                        total={documents.total}
                        currentPage={documents.current_page}
                        lastPage={documents.last_page}
                        onPage={goToPage}
                    />
                </div>
            </Card>
        </>
    );
}

DocumentIndex.layout = {
    title: 'Dokumen',
    description: 'Faktur supplier yang diekstrak otomatis (OCR).',
    actions: <IndexActions />,
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Dokumen',
        },
    ],
};
