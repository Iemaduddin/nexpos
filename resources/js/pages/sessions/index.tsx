import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import {
    close,
    create,
    index,
} from '@/actions/App/Http/Controllers/CashSessionController';
import { pos } from '@/actions/App/Http/Controllers/SaleController';
import EmptyState from '@/components/empty-state';
import InputError from '@/components/input-error';
import Pagination from '@/components/pagination';
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
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { formatIDR } from '@/lib/format';
import { dashboard } from '@/routes';
import type { CashSession, Paginated } from '@/types';

function formatDateTime(value: string | null): string {
    if (!value) {
        return '–';
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function IndexActions() {
    const { auth, openSessions } = usePage().props;
    const hasOpen = Array.isArray(openSessions) && openSessions.length > 0;

    if (!auth.permissions.includes('sales.create') || hasOpen) {
        return null;
    }

    return (
        <Button asChild>
            <Link href={create()}>
                <Plus className="size-4" />
                Buka Sesi
            </Link>
        </Button>
    );
}

export default function SessionIndex({
    openSessions,
    sessions,
}: {
    openSessions: CashSession[];
    sessions: Paginated<CashSession>;
}) {
    const { auth } = usePage().props;
    const canClose = auth.permissions.includes('sales.create');

    const [closing, setClosing] = useState<CashSession | null>(null);

    function goToPage(page: number) {
        router.get(
            index.url({ query: page > 1 ? { page } : {} }),
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Sesi Kas" />

            <div className="grid gap-4">
                {openSessions.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {openSessions.map((session) => (
                            <Card key={session.id}>
                                <CardHeader className="flex flex-row items-start justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-base font-medium">
                                            {session.store?.name ?? '–'}
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            Dibuka {session.opener?.name ?? '–'}{' '}
                                            ·{' '}
                                            {formatDateTime(session.opened_at)}
                                        </p>
                                    </div>
                                    <Badge>Sesi terbuka</Badge>
                                </CardHeader>
                                <CardContent className="grid gap-1 text-sm tabular-nums">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Saldo awal</span>
                                        <span>
                                            {formatIDR(session.opening_balance)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between font-medium">
                                        <span>Ekspektasi laci</span>
                                        <span>
                                            {formatIDR(session.expected ?? 0)}
                                        </span>
                                    </div>
                                    {canClose && (
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    setClosing(session)
                                                }
                                            >
                                                Tutup Sesi
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                asChild
                                            >
                                                <Link href={pos()}>
                                                    Ke Kasir
                                                </Link>
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <EmptyState
                            icon={Wallet}
                            title="Tidak ada sesi terbuka"
                            description="Buka sesi kas untuk mulai berjualan dan mencatat arus tunai laci."
                            action={<IndexActions />}
                        />
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-medium">
                            Riwayat Sesi
                        </CardTitle>
                    </CardHeader>
                    {sessions.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-y text-left text-muted-foreground">
                                        <th className="px-4 py-2.5 font-medium">
                                            Toko
                                        </th>
                                        <th className="px-4 py-2.5 font-medium">
                                            Dibuka / Ditutup
                                        </th>
                                        <th className="px-4 py-2.5 font-medium">
                                            Ekspektasi
                                        </th>
                                        <th className="px-4 py-2.5 font-medium">
                                            Aktual
                                        </th>
                                        <th className="px-4 py-2.5 text-right font-medium">
                                            Selisih
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.data.map((session) => (
                                        <tr
                                            key={session.id}
                                            className="border-b last:border-0"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-medium">
                                                    {session.store?.name ?? '–'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {session.opener?.name ??
                                                        '–'}
                                                    {' → '}
                                                    {session.closer?.name ??
                                                        '–'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                <p>
                                                    {formatDateTime(
                                                        session.opened_at,
                                                    )}
                                                </p>
                                                <p>
                                                    {formatDateTime(
                                                        session.closed_at,
                                                    )}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 tabular-nums">
                                                {formatIDR(
                                                    session.closing_expected ??
                                                        0,
                                                )}
                                            </td>
                                            <td className="px-4 py-3 tabular-nums">
                                                {formatIDR(
                                                    session.closing_actual ?? 0,
                                                )}
                                            </td>
                                            <td
                                                className={`px-4 py-3 text-right font-medium tabular-nums ${(session.difference ?? 0) < 0 ? 'text-destructive' : ''}`}
                                            >
                                                {formatIDR(
                                                    session.difference ?? 0,
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <CardContent>
                            <p className="py-4 text-center text-sm text-muted-foreground">
                                Belum ada riwayat sesi yang ditutup.
                            </p>
                        </CardContent>
                    )}
                    <div className="border-t">
                        <Pagination
                            from={sessions.from}
                            to={sessions.to}
                            total={sessions.total}
                            currentPage={sessions.current_page}
                            lastPage={sessions.last_page}
                            onPage={goToPage}
                        />
                    </div>
                </Card>
            </div>

            <Dialog
                open={closing !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setClosing(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tutup sesi kas?</DialogTitle>
                        <DialogDescription>
                            Hitung uang tunai di laci lalu masukkan jumlahnya.
                            Ekspektasi sistem{' '}
                            {formatIDR(closing?.expected ?? 0)}.
                        </DialogDescription>
                    </DialogHeader>
                    {closing && (
                        <Form
                            {...close.form(closing.id)}
                            options={{ preserveScroll: true }}
                        >
                            {({ processing, errors }) => (
                                <div className="grid gap-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor="closing_actual">
                                            Uang aktual di laci (Rp)
                                        </Label>
                                        <CurrencyInput
                                            id="closing_actual"
                                            name="closing_actual"
                                            required
                                            autoFocus
                                            className="tabular-nums"
                                        />
                                        <InputError
                                            message={errors.closing_actual}
                                        />
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="outline">
                                                Batal
                                            </Button>
                                        </DialogClose>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing && <Spinner />}
                                            Tutup Sesi
                                        </Button>
                                    </DialogFooter>
                                </div>
                            )}
                        </Form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

SessionIndex.layout = {
    title: 'Sesi Kas',
    description: 'Buka dan tutup sesi kasir per toko.',
    actions: <IndexActions />,
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Sesi Kas',
        },
    ],
};
