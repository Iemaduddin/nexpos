import { Form, Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { update } from '@/routes/pos-settings';
import { edit as editPosSettings } from '@/routes/pos-settings';
import type { BusinessSetting } from '@/types';

const paymentMethodLabels: Record<string, string> = {
    cash: 'Tunai',
    qris: 'QRIS',
    transfer: 'Transfer',
    edc_debit: 'Debit',
    edc_credit: 'Kredit',
    ewallet: 'E-Wallet',
};

const roundingOptions = [
    { value: 1, label: 'Tidak ada pembulatan' },
    { value: 10, label: 'Ke atas ke Rp 10' },
    { value: 50, label: 'Ke atas ke Rp 50' },
    { value: 100, label: 'Ke atas ke Rp 100' },
    { value: 500, label: 'Ke atas ke Rp 500' },
    { value: 1000, label: 'Ke atas ke Rp 1.000' },
];

export default function PosSettings({
    business,
    paymentMethods,
}: {
    business: BusinessSetting;
    paymentMethods: string[];
}) {
    const configuredMethods = business.enabled_payment_methods ?? [];
    const enabledMethods =
        configuredMethods.length > 0 ? configuredMethods : paymentMethods;

    return (
        <>
            <Head title="Pengaturan POS" />

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Pengaturan POS"
                    description="Atur pembayaran, pembulatan, dan batas diskon kasir"
                />

                <Form
                    {...update.form()}
                    options={{ preserveScroll: true }}
                    className="space-y-8"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-3">
                                <div>
                                    <Label>Metode pembayaran aktif</Label>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Kasir hanya dapat memilih metode yang diaktifkan.
                                    </p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {paymentMethods.map((method) => (
                                        <div
                                            key={method}
                                            className="flex items-center gap-3"
                                        >
                                            <Checkbox
                                                id={`payment-${method}`}
                                                name="enabled_payment_methods[]"
                                                value={method}
                                                defaultChecked={enabledMethods.includes(
                                                    method,
                                                )}
                                            />
                                            <Label
                                                htmlFor={`payment-${method}`}
                                                className="font-normal"
                                            >
                                                {paymentMethodLabels[method] ?? method}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                                <InputError
                                    message={errors.enabled_payment_methods}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="rounding_unit">
                                    Pembulatan total pembayaran
                                </Label>
                                <select
                                    id="rounding_unit"
                                    name="rounding_unit"
                                    defaultValue={business.rounding_unit ?? 1}
                                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    {roundingOptions.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.rounding_unit} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="max_discount_percent">
                                    Batas diskon maksimum (%)
                                </Label>
                                <Input
                                    id="max_discount_percent"
                                    name="max_discount_percent"
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.01}
                                    defaultValue={Number(
                                        business.max_discount_percent ?? 100,
                                    )}
                                    required
                                    className="tabular-nums"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Batas ini berlaku untuk total diskon per transaksi.
                                </p>
                                <InputError
                                    message={errors.max_discount_percent}
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Simpan
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

PosSettings.layout = {
    breadcrumbs: [
        {
            title: 'Pengaturan POS',
            href: editPosSettings(),
        },
    ],
};
