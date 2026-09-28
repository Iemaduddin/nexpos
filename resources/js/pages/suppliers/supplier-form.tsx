import { Form } from '@inertiajs/react';
import { store } from '@/actions/App/Http/Controllers/SupplierController';
import { update } from '@/actions/App/Http/Controllers/SupplierController';
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
import type { Supplier } from '@/types';

export type SupplierFormInitial = {
    name: string;
    contact_person: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    is_active: boolean;
};

export default function SupplierForm({
    action,
    initial,
    submitLabel,
    onCancel,
}: {
    action: RouteFormDefinition<'post'>;
    initial: SupplierFormInitial;
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
                        <Label htmlFor="name">Nama supplier</Label>
                        <Input
                            id="name"
                            name="name"
                            defaultValue={initial.name}
                            required
                            autoFocus
                            maxLength={255}
                            placeholder="cth. Distributor Maju Jaya"
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="contact_person">
                                Narahubung{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opsional)
                                </span>
                            </Label>
                            <Input
                                id="contact_person"
                                name="contact_person"
                                defaultValue={initial.contact_person}
                                maxLength={255}
                                placeholder="cth. Pak Andi"
                            />
                            <InputError
                                message={errors.contact_person}
                            />
                        </div>
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
                        />
                        <InputError message={errors.email} />
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
                        <Label htmlFor="notes">
                            Catatan{' '}
                            <span className="font-normal text-muted-foreground">
                                (opsional)
                            </span>
                        </Label>
                        <textarea
                            id="notes"
                            name="notes"
                            defaultValue={initial.notes}
                            rows={2}
                            maxLength={1000}
                            placeholder="cth. Tempo 14 hari, diskon 2%"
                            className="flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        />
                        <InputError message={errors.notes} />
                    </div>

                    <div className="flex items-center space-x-3">
                        <input type="hidden" name="is_active" value="0" />
                        <Checkbox
                            id="is_active"
                            name="is_active"
                            value="1"
                            defaultChecked={initial.is_active}
                        />
                        <Label htmlFor="is_active">Supplier aktif</Label>
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

const emptyInitial: SupplierFormInitial = {
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    is_active: true,
};

export function SupplierCreateDialog({
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
                    <DialogTitle>Tambah Supplier</DialogTitle>
                    <DialogDescription>
                        Daftarkan supplier baru untuk pembelian.
                    </DialogDescription>
                </DialogHeader>
                <SupplierForm
                    action={store.form()}
                    initial={emptyInitial}
                    submitLabel="Simpan Supplier"
                    onCancel={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

export function SupplierEditDialog({
    supplier,
    open,
    onOpenChange,
}: {
    supplier: Supplier;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Ubah Supplier</DialogTitle>
                    <DialogDescription>
                        Perbarui data supplier {supplier.name}.
                    </DialogDescription>
                </DialogHeader>
                <SupplierForm
                    key={supplier.id}
                    action={update.form(supplier.id)}
                    initial={{
                        name: supplier.name,
                        contact_person: supplier.contact_person ?? '',
                        phone: supplier.phone ?? '',
                        email: supplier.email ?? '',
                        address: supplier.address ?? '',
                        notes: supplier.notes ?? '',
                        is_active: supplier.is_active,
                    }}
                    submitLabel="Simpan Perubahan"
                    onCancel={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}
