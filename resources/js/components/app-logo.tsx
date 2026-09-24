import { usePage } from '@inertiajs/react';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <img
                src="/logo.webp"
                alt="NEXPOS"
                className="size-8 shrink-0 rounded-md object-cover"
            />
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="truncate leading-tight font-semibold">
                    {name}
                </span>
                <span className="truncate text-[10px] leading-tight tracking-widest text-muted-foreground">
                    AROBIDSH ID
                </span>
            </div>
        </>
    );
}
