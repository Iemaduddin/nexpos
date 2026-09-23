export function formatIDR(value: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

export function formatQty(value: number | string | null | undefined): string {
    const num = Number(value ?? 0);

    if (!Number.isFinite(num)) {
        return '0';
    }

    return num.toLocaleString('id-ID', { maximumFractionDigits: 3 });
}
