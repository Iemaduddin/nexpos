import { Form } from '@inertiajs/react';
import { store } from '@/actions/App/Http/Controllers/CustomerController';
import { update } from '@/actions/App/Http/Controllers/CustomerController';
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
import type { Customer } from '@/types';

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
    onCancel,
}: {
    action: RouteFormDefinition<'post'>;
    initial: CustomerFormInitial;
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
                        <input type="hidden" name="is_active" value="0" />
                        <Checkbox
                            id="is_active"
                            name="is_active"
                            value="1"
                            defaultChecked={initial.is_active}
                        />
                        <Label htmlFor="is_active">Pelanggan aktif</Label>
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

const emptyInitial: CustomerFormInitial = {
    name: '',
    phone: '',
    email: '',
    address: '',
    birthdate: '',
    is_active: true,
};

export function CustomerCreateDialog({
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
                    <DialogTitle>Tambah Pelanggan</DialogTitle>
                    <DialogDescription>
                        Daftarkan pelanggan baru untuk transaksi.
                    </DialogDescription>
                </DialogHeader>
                <CustomerForm
                    action={store.form()}
                    initial={emptyInitial}
                    submitLabel="Simpan Pelanggan"
                    onCancel={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

export function CustomerEditDialog({
    customer,
    open,
    onOpenChange,
}: {
    customer: Customer;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Ubah Pelanggan</DialogTitle>
                    <DialogDescription>
                        Perbarui data pelanggan {customer.name}.
                    </DialogDescription>
                </DialogHeader>
                <CustomerForm
                    key={customer.id}
                    action={update.form(customer.id)}
                    initial={{
                        name: customer.name,
                        phone: customer.phone ?? '',
                        email: customer.email ?? '',
                        address: customer.address ?? '',
                        birthdate: customer.birthdate ?? '',
                        is_active: customer.is_active,
                    }}
                    submitLabel="Simpan Perubahan"
                    onCancel={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}
