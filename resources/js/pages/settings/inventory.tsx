import { Form, Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { edit as editInventorySettings, update } from '@/routes/inventory-settings';
import type { BusinessSetting } from '@/types';

export default function InventorySettings({
    business,
}: {
    business: BusinessSetting;
}) {
    return (
        <>
            <Head title="Pengaturan Inventaris" />

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Pengaturan Inventaris"
                    description="Atur nilai awal untuk pemantauan stok produk baru"
                />

                <Form
                    {...update.form()}
                    options={{ preserveScroll: true }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="default_low_stock_threshold">
                                    Ambang stok rendah default
                                </Label>
                                <Input
                                    id="default_low_stock_threshold"
                                    name="default_low_stock_threshold"
                                    type="number"
                                    min={0}
                                    max={1000000}
                                    step={1}
                                    defaultValue={
                                        business.default_low_stock_threshold
                                    }
                                    required
                                    className="tabular-nums"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Nilai ini digunakan saat membuat produk atau
                                    varian baru. Nilai manual pada produk lama
                                    tidak diubah.
                                </p>
                                <InputError
                                    message={errors.default_low_stock_threshold}
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

InventorySettings.layout = {
    breadcrumbs: [
        {
            title: 'Pengaturan Inventaris',
            href: editInventorySettings(),
        },
    ],
};
