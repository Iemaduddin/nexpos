import { Form, Head, Link } from '@inertiajs/react';
import { index as storesIndex } from '@/actions/App/Http/Controllers/StoreController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { update } from '@/routes/business';
import type { BusinessSetting } from '@/types';

export default function Business({
    business,
    timezones,
    status,
}: {
    business: BusinessSetting;
    timezones: string[];
    status?: string;
}) {
    return (
        <>
            <Head title="Profil Toko" />

            <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <Heading
                        variant="small"
                        title="Profil Toko"
                        description="Identitas usaha yang tampil di struk dan laporan"
                    />
                    <Button variant="outline" size="sm" asChild>
                        <Link href={storesIndex()}>Kelola Gerai</Link>
                    </Button>
                </div>

                {status && (
                    <p className="text-sm font-medium text-green-600">
                        {status}
                    </p>
                )}

                <Form
                    {...update.form()}
                    options={{ preserveScroll: true }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nama usaha</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={business.name}
                                        required
                                        maxLength={255}
                                    />
                                    <InputError message={errors.name} />
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
                                        defaultValue={business.address ?? ''}
                                        rows={2}
                                        className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    />
                                    <InputError message={errors.address} />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
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
                                            defaultValue={business.phone ?? ''}
                                            maxLength={30}
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
                                            defaultValue={business.email ?? ''}
                                            maxLength={255}
                                        />
                                        <InputError message={errors.email} />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor="currency">
                                            Mata uang
                                        </Label>
                                        <Input
                                            id="currency"
                                            name="currency"
                                            defaultValue={business.currency}
                                            required
                                            maxLength={3}
                                            className="uppercase"
                                        />
                                        <InputError message={errors.currency} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="timezone">
                                            Zona waktu
                                        </Label>
                                        <select
                                            id="timezone"
                                            name="timezone"
                                            defaultValue={business.timezone}
                                            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        >
                                            {timezones.map((tz) => (
                                                <option key={tz} value={tz}>
                                                    {tz}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError message={errors.timezone} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="default_tax_rate">
                                            Pajak default (%)
                                        </Label>
                                        <Input
                                            id="default_tax_rate"
                                            name="default_tax_rate"
                                            type="number"
                                            min={0}
                                            max={100}
                                            step={0.01}
                                            defaultValue={Number(
                                                business.default_tax_rate,
                                            )}
                                            required
                                            className="tabular-nums"
                                        />
                                        <InputError
                                            message={errors.default_tax_rate}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="receipt_header">
                                        Kepala struk{' '}
                                        <span className="font-normal text-muted-foreground">
                                            (opsional)
                                        </span>
                                    </Label>
                                    <Input
                                        id="receipt_header"
                                        name="receipt_header"
                                        defaultValue={
                                            business.receipt_header ?? ''
                                        }
                                        maxLength={500}
                                    />
                                    <InputError
                                        message={errors.receipt_header}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="receipt_footer">
                                        Kaki struk{' '}
                                        <span className="font-normal text-muted-foreground">
                                            (opsional)
                                        </span>
                                    </Label>
                                    <Input
                                        id="receipt_footer"
                                        name="receipt_footer"
                                        defaultValue={
                                            business.receipt_footer ?? ''
                                        }
                                        maxLength={500}
                                    />
                                    <InputError
                                        message={errors.receipt_footer}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="logo">
                                        Logo{' '}
                                        <span className="font-normal text-muted-foreground">
                                            (opsional, maks 2 MB)
                                        </span>
                                    </Label>
                                    {business.logo_path && (
                                        <img
                                            src={`/storage/${business.logo_path}`}
                                            alt="Logo usaha"
                                            className="size-16 rounded-lg border object-cover"
                                        />
                                    )}
                                    <Input
                                        id="logo"
                                        name="logo"
                                        type="file"
                                        accept="image/*"
                                    />
                                    <InputError message={errors.logo} />
                                </div>
                            </div>

                            <Button type="submit" disabled={processing}>
                                {processing && <Spinner />}
                                Simpan
                            </Button>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
