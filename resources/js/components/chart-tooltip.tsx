import { formatIDR } from '@/lib/format';

/**
 * Single tooltip card for every Nivo chart: card background, color dot
 * per series, tabular numbers. Replaces Nivo's default dark tooltip
 * which clashes with the light/dark theme.
 */
export default function ChartTooltip({
    title,
    rows,
}: {
    title?: string;
    rows: { label: string; value: number; money?: boolean; color?: string }[];
}) {
    return (
        <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
            {title && <p className="mb-1 font-medium">{title}</p>}
            {rows.map((row) => (
                <p
                    key={row.label}
                    className="flex items-center justify-between gap-4"
                >
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        {row.color && (
                            <span
                                aria-hidden
                                className="size-2 rounded-full"
                                style={{ backgroundColor: row.color }}
                            />
                        )}
                        {row.label}
                    </span>
                    <span className="font-medium tabular-nums">
                        {row.money ? formatIDR(row.value) : row.value}
                    </span>
                </p>
            ))}
        </div>
    );
}
