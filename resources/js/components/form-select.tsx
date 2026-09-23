import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';

export default function FormSelect({
    id,
    name,
    label,
    optional = false,
    defaultValue = '',
    options,
    error,
    placeholder = '— Pilih —',
}: {
    id: string;
    name: string;
    label: string;
    optional?: boolean;
    defaultValue?: string | number;
    options: { id: number | string; name: string }[];
    error?: string;
    placeholder?: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>
                {label}{' '}
                {optional && (
                    <span className="font-normal text-muted-foreground">
                        (opsional)
                    </span>
                )}
            </Label>
            <select
                id={id}
                name={name}
                defaultValue={defaultValue}
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
            <InputError message={error} />
        </div>
    );
}
