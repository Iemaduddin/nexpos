import { Form, Link } from '@inertiajs/react';
import { index } from '@/actions/App/Http/Controllers/CustomerController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { RouteFormDefinition } from '@/wayfinder';

export type CustomerFormInitial = {
    name: string;
    phone: string;
    email: string;
    address: string;
    birthdate: string;
    is_active: boolean;
};

export default function CustomerForm({
    action,
    initial,
    submitLabel,
}: {
    action: RouteFormDefinition<'post'>;
    initial: CustomerFormInitial;
    submitLabel: string;
}) {
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
                                <Label htmlFor="name">Nama pelanggan</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={initial.name}
                                    required
                                    autoFocus
                                    maxLength={255}
                                    placeholder="cth. Budi Santoso"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">
                                        Telepon{' '}
                                        <span className="font-normal text-muted-foreground">
                                            (opsional)
                                        </span>
                                    </Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        defaultValue={initial.phone}
                                        maxLength={30}
                                        placeholder="cth. 081234567890"
                                    />
                                    <InputError message={errors.phone} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">
                                        Email{' '}
                                        <span className="font-normal text-muted-foreground">
                                            (opsional)
                                        </span>
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        defaultValue={initial.email}
                                        maxLength={255}
                                        placeholder="cth. budi@mail.com"
                                    />
                                    <InputError message={errors.email} />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="address">
                                    Alamat{' '}
                                    <span className="font-normal text-muted-foreground">
                                        (opsional)
                                    </span>
                                </Label>
                                <textarea
                                    id="address"
                                    name="address"
                                    defaultValue={initial.address}
                                    rows={2}
                                    maxLength={1000}
                                    className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                                <InputError message={errors.address} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="birthdate">
                                    Tanggal lahir{' '}
                                    <span className="font-normal text-muted-foreground">
                                        (opsional)
                                    </span>
                                </Label>
                                <Input
                                    id="birthdate"
                                    name="birthdate"
                                    type="date"
                                    defaultValue={initial.birthdate}
                                />
                                <InputError message={errors.birthdate} />
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
                                    Pelanggan aktif
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
