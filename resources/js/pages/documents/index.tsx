import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Eye, FileScan, Plus } from 'lucide-react';
import {
    index,
    show,
    store,
} from '@/actions/App/Http/Controllers/DocumentController';
import EmptyState from '@/components/empty-state';
import Pagination from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
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
    const [uploading, setUploading] = useState(false);

    if (!auth.permissions.includes('inventory.purchase')) {
        return null;
    }

    return (
        <>
            <Button onClick={() => setUploading(true)}>
                <Plus className="size-4" />
                Unggah Faktur
            </Button>
            <Dialog open={uploading} onOpenChange={setUploading}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Unggah Faktur</DialogTitle>
                        <DialogDescription>
                            Unggah foto faktur supplier untuk diekstrak
                            otomatis.
                        </DialogDescription>
                    </DialogHeader>
                    <Form
                        {...store.form()}
                        options={{ preserveScroll: true }}
                        onSuccess={() => setUploading(false)}
                        className="grid gap-5"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="file">
                                        Foto / pindaian faktur
                                    </Label>
                                    <Input
                                        id="file"
                                        name="file"
                                        type="file"
                                        accept="image/*"
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        JPG, PNG, atau WebP hingga 5 MB. Hasil
                                        jelas mempercepat ekstraksi.
                                    </p>
                                    <InputError message={errors.file} />
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setUploading(false)}
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        {processing
                                            ? 'Memproses OCR...'
                                            : 'Unggah & Ekstrak'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>
        </>
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
