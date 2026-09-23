import { Form, Head, Link } from '@inertiajs/react';
import {
    index,
    store,
} from '@/actions/App/Http/Controllers/DocumentController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';

export default function DocumentCreate() {
    return (
        <>
            <Head title="Unggah Faktur" />

            <Card className="max-w-xl">
                <CardContent className="pt-6">
                    <Form
                        {...store.form()}
                        options={{ preserveScroll: true }}
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
                                <div className="flex items-center gap-2">
                                    <Button type="submit" disabled={processing}>
                                        {processing && <Spinner />}
                                        {processing
                                            ? 'Memproses OCR...'
                                            : 'Unggah & Ekstrak'}
                                    </Button>
                                    <Button variant="outline" asChild>
                                        <Link href={index()}>Batal</Link>
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </CardContent>
            </Card>
        </>
    );
}

DocumentCreate.layout = {
    title: 'Unggah Faktur',
    description: 'Unggah foto faktur supplier untuk diekstrak otomatis.',
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
            title: 'Unggah',
        },
    ],
};
