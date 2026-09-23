import { Form, Head, Link } from '@inertiajs/react';
import {
    index,
    store,
} from '@/actions/App/Http/Controllers/CashSessionController';
import { pos } from '@/actions/App/Http/Controllers/SaleController';
import InputError from '@/components/input-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';

export default function SessionCreate({
    store: shop,
    alreadyOpen,
}: {
    store: { id: number; name: string };
    alreadyOpen: boolean;
}) {
    return (
        <>
            <Head title="Buka Sesi Kas" />

            <div className="grid max-w-xl gap-4">
                {alreadyOpen ? (
                    <Alert>
                        <AlertDescription>
                            {shop.name} sudah memiliki sesi kas yang terbuka.
                            Lanjutkan berjualan di kasir.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <Card>
                        <CardContent className="pt-6">
                            <Form
                                {...store.form()}
                                options={{ preserveScroll: true }}
                                className="grid gap-5"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="grid gap-2">
                                            <Label>Toko</Label>
                                            <p className="text-sm font-medium">
                                                {shop.name}
                                            </p>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="opening_balance">
                                                Saldo awal laci (Rp)
                                            </Label>
                                            <Input
                                                id="opening_balance"
                                                name="opening_balance"
                                                type="number"
                                                min={0}
                                                defaultValue="0"
                                                required
                                                autoFocus
                                                className="tabular-nums"
                                            />
                                            <InputError
                                                message={errors.opening_balance}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="submit"
                                                disabled={processing}
                                            >
                                                {processing && <Spinner />}
                                                Buka Sesi
                                            </Button>
                                            <Button variant="outline" asChild>
                                                <Link href={index()}>
                                                    Batal
                                                </Link>
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    </Card>
                )}

                {alreadyOpen && (
                    <div>
                        <Button asChild>
                            <Link href={pos()}>Ke Kasir</Link>
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}

SessionCreate.layout = {
    title: 'Buka Sesi Kas',
    description: 'Catat saldo awal laci sebelum mulai berjualan.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Sesi Kas',
            href: index(),
        },
        {
            title: 'Buka',
        },
    ],
};
