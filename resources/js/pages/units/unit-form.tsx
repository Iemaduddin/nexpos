import { Form, Link } from '@inertiajs/react';
import { index } from '@/actions/App/Http/Controllers/UnitController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { RouteFormDefinition } from '@/wayfinder';

export type UnitFormInitial = {
    name: string;
    symbol: string;
    is_active: boolean;
};

export default function UnitForm({
    action,
    initial,
    submitLabel,
}: {
    action: RouteFormDefinition<'post'>;
    initial: UnitFormInitial;
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
                                <Label htmlFor="name">Nama satuan</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={initial.name}
                                    required
                                    autoFocus
                                    maxLength={255}
                                    placeholder="cth. Pieces"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="symbol">Simbol</Label>
                                <Input
                                    id="symbol"
                                    name="symbol"
                                    defaultValue={initial.symbol}
                                    required
                                    maxLength={20}
                                    placeholder="cth. pcs"
                                />
                                <InputError message={errors.symbol} />
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
                                    Tampilkan satuan (aktif)
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
