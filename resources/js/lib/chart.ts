/** Shared Nivo chart styling: one theme, one tick format, one tooltip. */

export const nivoTheme = {
    text: {
        fill: 'var(--muted-foreground)',
        fontSize: 11,
    },
    axis: {
        ticks: {
            text: {
                fill: 'var(--muted-foreground)',
                fontSize: 11,
            },
        },
        legend: {
            text: {
                fill: 'var(--muted-foreground)',
                fontSize: 11,
            },
        },
    },
    grid: {
        line: {
            stroke: 'var(--border)',
            strokeDasharray: '3 3',
        },
    },
    legends: {
        text: {
            fill: 'var(--muted-foreground)',
            fontSize: 11,
        },
    },
};

/** Short IDR axis ticks: 900 → "900", 15.000 → "15rb", 2,5jt → "2,5jt". */
export function compactIDR(value: number | string): string {
    const num = Number(value);
    if (!Number.isFinite(num)) {
        return '0';
    }
    const abs = Math.abs(num);
    const trim = (n: number) =>
        String(Math.round(n * 10) / 10).replace('.', ',');
    if (abs >= 1_000_000_000) {
        return `${trim(num / 1_000_000_000)}M`;
    }
    if (abs >= 1_000_000) {
        return `${trim(num / 1_000_000)}jt`;
    }
    if (abs >= 1_000) {
        return `${trim(num / 1_000)}rb`;
    }
    return String(Math.round(num));
}

/** Truncate long category/product labels on chart axes. */
export function shortLabel(value: number | string, max = 14): string {
    const text = String(value);
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
