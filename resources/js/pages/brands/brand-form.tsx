import { Form, Link } from '@inertiajs/react';
import { useState } from 'react';
import { index } from '@/actions/App/Http/Controllers/BrandController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { RouteFormDefinition } from '@/wayfinder';

export type BrandFormInitial = {
    name: string;
    slug: string;
    description: string;
    is_active: boolean;
};

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

export default function BrandForm({
    action,
    initial,
    submitLabel,
}: {
    action: RouteFormDefinition<'post'>;
    initial: BrandFormInitial;
    submitLabel: string;
}) {
    const [name, setName] = useState(initial.name);
    const [slug, setSlug] = useState(initial.slug);
    const [slugTouched, setSlugTouched] = useState(initial.slug !== '');

    return (
        <Card>
            <CardContent className="pt-6">
                <Form
                    {...action}
                    options={{ preserveScroll: true }}
                    className="grid max-w-xl gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nama brand</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (!slugTouched) {
                                            setSlug(slugify(e.target.value));
                                        }
                                    }}
                                    required
                                    autoFocus
                                    maxLength={255}
                                    placeholder="cth. Kapal Api"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="slug">Slug</Label>
                                <Input
                                    id="slug"
                                    name="slug"
                                    value={slug}
                                    onChange={(e) => {
                                        setSlugTouched(true);
                                        setSlug(e.target.value);
                                    }}
                                    required
                                    maxLength={255}
                                    placeholder="cth. kapal-api"
                                />
                                <InputError message={errors.slug} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">
                                    Deskripsi{' '}
                                    <span className="font-normal text-muted-foreground">
                                        (opsional)
                                    </span>
                                </Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    defaultValue={initial.description}
                                    rows={3}
                                    maxLength={1000}
                                    placeholder="Keterangan singkat brand"
                                    className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                                <InputError message={errors.description} />
                            </div>

                            <div className="flex items-center space-x-3">
                                <input
                                    type="hidden"
                                    name="is_active"
                                    value="0"
                                />
                                <Checkbox
                                    id="is_active"
                                    name="is_active"
                                    value="1"
                                    defaultChecked={initial.is_active}
                                />
                                <Label htmlFor="is_active">
                                    Tampilkan brand (aktif)
                                </Label>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    {submitLabel}
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
    );
}
