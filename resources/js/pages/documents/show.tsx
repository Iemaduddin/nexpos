import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { FileScan, Trash2 } from 'lucide-react';
import {
    destroy,
    file as fileRoute,
    index,
    verify,
} from '@/actions/App/Http/Controllers/DocumentController';
import { show as showPurchase } from '@/actions/App/Http/Controllers/PurchaseController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatIDR } from '@/lib/format';
import { dashboard } from '@/routes';
import type { Document } from '@/types';

const statusLabel: Record<string, string> = {
    uploaded: 'Diunggah',
    processing: 'Diproses',
    processed: 'Siap verifikasi',
    failed: 'Gagal',
    verified: 'Terverifikasi',
};

export default function DocumentShow({ document }: { document: Document }) {
    const { auth } = usePage().props;
    const canManage = auth.permissions.includes('inventory.purchase');
    const [deleting, setDeleting] = useState(false);

    const extracted = document.extracted_data;

    return (
        <>
            <Head title={`Dokumen #${document.id}`} />

            <div className="grid items-start gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-medium">
                            Berkas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <img
                            src={fileRoute(document.id).url}
                            alt={`Faktur ${document.id}`}
                            className="w-full rounded-lg border"
                        />
                    </CardContent>
                </Card>

                <div className="grid content-start gap-4">
                    <Card>
                        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1.5">
                                <CardTitle className="text-lg">
                                    Faktur #{document.id}
                                </CardTitle>
                                <Badge
                                    variant={
                                        document.status === 'verified'
                                            ? 'default'
                                            : document.status === 'failed'
                                              ? 'destructive'
                                              : 'secondary'
                                    }
                                >
                                    {statusLabel[document.status] ??
                                        document.status}
                                </Badge>
                            </div>
                            {canManage && (
                                <div className="flex flex-wrap gap-2">
                                    {document.status === 'processed' && (
                                        <Button size="sm" asChild>
                                            <Link href={verify(document.id)}>
                                                <FileScan className="size-4" />
                                                Verifikasi
                                            </Link>
                                        </Button>
                                    )}
                                    {document.status !== 'verified' && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => setDeleting(true)}
                                        >
                                            <Trash2 className="size-4" />
                                            Hapus
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="grid gap-2 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">
                                    Supplier
                                </span>
                                <span className="text-right font-medium">
                                    {extracted?.supplier_name ??
                                        document.supplier?.name ??
                                        '–'}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">
                                    Nomor faktur
                                </span>
                                <span className="font-medium tabular-nums">
                                    {extracted?.number ?? '–'}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">
                                    Tanggal
                                </span>
                                <span className="font-medium">
                                    {extracted?.date ?? '–'}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">
                                    Total terbaca
                                </span>
                                <span className="font-medium tabular-nums">
                                    {extracted?.total !== null &&
                                    extracted?.total !== undefined
                                        ? formatIDR(extracted.total)
                                        : '–'}
                                </span>
                            </div>
                            {document.purchase && (
                                <div className="flex justify-between gap-4 border-t pt-2">
                                    <span className="text-muted-foreground">
                                        Pembelian
                                    </span>
                                    <Link
                                        href={showPurchase(
                                            document.purchase.id,
                                        )}
                                        className="font-medium hover:underline"
                                    >
                                        {document.purchase.number}
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-medium">
                                Item Terbaca
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {extracted && extracted.items.length > 0 ? (
                                <table className="w-full text-sm">
                                    <tbody>
                                        {extracted.items.map((item, i) => (
                                            <tr
                                                key={i}
                                                className="border-t first:border-0"
                                            >
                                                <td className="px-4 py-2.5">
                                                    <p className="font-medium">
                                                        {item.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground tabular-nums">
                                                        {item.qty} x{' '}
                                                        {formatIDR(item.price)}
                                                    </p>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="px-4 pb-4 text-sm text-muted-foreground">
                                    {document.status === 'failed'
                                        ? 'Ekstraksi gagal. Coba unggah ulang dengan foto yang lebih jelas.'
                                        : 'Tidak ada item terbaca.'}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {document.ocr_text && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base font-medium">
                                    Teks Mentah OCR
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                                    {document.ocr_text}
                                </pre>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <Dialog open={deleting} onOpenChange={setDeleting}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus dokumen?</DialogTitle>
                        <DialogDescription>
                            Berkas dan hasil ekstraksi akan dihapus permanen.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Batal</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={() =>
                                router.delete(destroy(document.id).url)
                            }
                        >
                            Ya, hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

DocumentShow.layout = {
    title: 'Detail Dokumen',
    description: 'Hasil ekstraksi faktur dan tindak lanjutnya.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Dokumen',
            href: index(),
        },
        {
            title: 'Detail',
        },
    ],
};
