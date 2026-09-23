import { Form, Link } from '@inertiajs/react';
import { index } from '@/actions/App/Http/Controllers/UserController';
import FormSelect from '@/components/form-select';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PasswordInput from '@/components/password-input';
import { Spinner } from '@/components/ui/spinner';
import type { RouteFormDefinition } from '@/wayfinder';
import type { OptionItem, RoleOption, StoreOption } from '@/types';

export type UserFormInitial = {
    name: string;
    email: string;
    role: string;
    store_id: string;
    is_active: boolean;
};

export default function UserForm({
    action,
    initial,
    roles,
    stores,
    submitLabel,
    passwordRequired,
}: {
    action: RouteFormDefinition<'post'>;
    initial: UserFormInitial;
    roles: RoleOption[];
    stores: StoreOption[];
    submitLabel: string;
    passwordRequired: boolean;
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
                                <Label htmlFor="name">Nama</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={initial.name}
                                    required
                                    autoFocus
                                    maxLength={255}
                                    placeholder="cth. Budi Kasir"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    defaultValue={initial.email}
                                    required
                                    maxLength={255}
                                    placeholder="cth. budi@toko.com"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">
                                    Kata sandi{' '}
                                    {!passwordRequired && (
                                        <span className="font-normal text-muted-foreground">
                                            (kosongkan bila tidak diubah)
                                        </span>
                                    )}
                                </Label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required={passwordRequired}
                                    autoComplete="new-password"
                                    placeholder="Minimal 8 karakter"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-5 sm:grid-cols-2">
                                <FormSelect
                                    id="role"
                                    name="role"
                                    label="Peran"
                                    defaultValue={initial.role}
                                    options={roles}
                                    error={errors.role}
                                    placeholder="— Pilih peran —"
                                />
                                <FormSelect
                                    id="store_id"
                                    name="store_id"
                                    label="Gerai"
                                    optional
                                    defaultValue={initial.store_id}
                                    options={stores}
                                    error={errors.store_id}
                                    placeholder="— Semua gerai —"
                                />
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
                                    Akun aktif (bisa masuk)
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
