import { Form } from '@inertiajs/react';
import { store } from '@/actions/App/Http/Controllers/UnitController';
import { update } from '@/actions/App/Http/Controllers/UnitController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { RouteFormDefinition } from '@/wayfinder';
import type { Unit } from '@/types';

export type UnitFormInitial = {
    name: string;
    symbol: string;
    is_active: boolean;
};

export default function UnitForm({
    action,
    initial,
    submitLabel,
    onCancel,
}: {
    action: RouteFormDefinition<'post'>;
    initial: UnitFormInitial;
    submitLabel: string;
    onCancel: () => void;
}) {
    return (
        <Form
            {...action}
            options={{ preserveScroll: true }}
            onSuccess={() => onCancel()}
            className="grid gap-5"
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
                        <input type="hidden" name="is_active" value="0" />
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

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            {submitLabel}
                        </Button>
                    </div>
                </>
            )}
        </Form>
    );
}

const emptyInitial: UnitFormInitial = {
    name: '',
    symbol: '',
    is_active: true,
};

export function UnitCreateDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Tambah Satuan</DialogTitle>
                    <DialogDescription>
                        Buat satuan baru untuk produk Anda.
                    </DialogDescription>
                </DialogHeader>
                <UnitForm
                    action={store.form()}
                    initial={emptyInitial}
                    submitLabel="Simpan Satuan"
                    onCancel={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

export function UnitEditDialog({
    unit,
    open,
    onOpenChange,
}: {
    unit: Unit;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Ubah Satuan</DialogTitle>
                    <DialogDescription>
                        Perbarui data satuan {unit.name}.
                    </DialogDescription>
                </DialogHeader>
                <UnitForm
                    key={unit.id}
                    action={update.form(unit.id)}
                    initial={{
                        name: unit.name,
                        symbol: unit.symbol,
                        is_active: unit.is_active,
                    }}
                    submitLabel="Simpan Perubahan"
                    onCancel={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}
