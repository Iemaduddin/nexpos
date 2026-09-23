import { Head, Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    Banknote,
    Minus,
    Package,
    Plus,
    ScanBarcode,
    ShoppingCart,
    Trash2,
    Wallet,
} from 'lucide-react';
import { checkout } from '@/actions/App/Http/Controllers/SaleController';
import { index as sessionsIndex } from '@/actions/App/Http/Controllers/CashSessionController';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { formatIDR, formatQty } from '@/lib/format';
import { paymentMethodLabel } from '@/lib/sale';
import { dashboard } from '@/routes';
import type { PosCustomer, PosProduct } from '@/types';

type Props = {
    store: { id: number; name: string };
    openSession: { id: number; opened_at: string | null } | null;
    tax_rate: number;
    payment_methods: string[];
    rounding_unit: number;
    max_discount_percent: number;
    customers: PosCustomer[];
    products: PosProduct[];
};

type Tile = {
    key: string;
    product_id: number;
    variant_id: number | null;
    name: string;
    sub: string;
    price: number;
    stock: number | null;
    track: boolean;
    unit: string;
    whole: boolean;
};

type CartLine = Tile & {
    qty: number;
    discount: number;
};

const WHOLE_UNITS = ['pcs', 'pack', 'box'];

type PayRow = {
    key: number;
    method: string;
    amount: string;
    reference_no: string;
};

let rowKey = 0;

const paymentMethodOptions = Object.entries(paymentMethodLabel).map(
    ([value, label]) => ({ value, label }),
);

export default function PosIndex({
    store,
    openSession,
    tax_rate,
    payment_methods,
    rounding_unit,
    max_discount_percent,
    customers,
    products,
}: Props) {
    const { auth, errors } = usePage().props;
    const canDiscount = auth.permissions.includes('sales.discount');
    const paymentMethods = paymentMethodOptions.filter((method) =>
        payment_methods.includes(method.value),
    );
    const defaultPaymentMethod = paymentMethods[0]?.value ?? 'cash';

    const [query, setQuery] = useState('');
    const [cart, setCart] = useState<CartLine[]>([]);
    const [customerId, setCustomerId] = useState('');
    const [cartDiscount, setCartDiscount] = useState('');
    const [payments, setPayments] = useState<PayRow[]>([
        {
            key: 0,
            method: defaultPaymentMethod,
            amount: '',
            reference_no: '',
        },
    ]);
    const [processing, setProcessing] = useState(false);

    const tiles: Tile[] = useMemo(() => {
        const rows: Tile[] = [];

        for (const product of products) {
            const whole = WHOLE_UNITS.includes(product.unit.toLowerCase());

            if (product.variants.length === 0) {
                rows.push({
                    key: `p${product.id}`,
                    product_id: product.id,
                    variant_id: null,
                    name: product.name,
                    sub: product.sku,
                    price: product.selling_price,
                    stock: product.stock,
                    track: product.track_inventory,
                    unit: product.unit,
                    whole,
                });
            } else {
                for (const variant of product.variants) {
                    rows.push({
                        key: `p${product.id}v${variant.id}`,
                        product_id: product.id,
                        variant_id: variant.id,
                        name: product.name,
                        sub: `${variant.name} · ${variant.sku}`,
                        price: variant.selling_price,
                        stock: variant.stock,
                        track: product.track_inventory,
                        unit: product.unit,
                        whole,
                    });
                }
            }
        }

        return rows;
    }, [products]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        if (!q) {
            return tiles;
        }

        return tiles.filter((tile) =>
            [tile.name, tile.sub].some((field) =>
                field.toLowerCase().includes(q),
            ),
        );
    }, [tiles, query]);

    const grossSubtotal = cart.reduce(
        (sum, line) => sum + Math.round(line.qty * line.price),
        0,
    );
    const subtotal = cart.reduce(
        (sum, line) => sum + Math.round(line.qty * line.price) - line.discount,
        0,
    );
    const lineDiscountTotal = cart.reduce(
        (sum, line) => sum + line.discount,
        0,
    );
    const maxDiscount = Math.floor(
        (grossSubtotal * max_discount_percent) / 100,
    );
    const discountTotal = Math.min(
        Number(cartDiscount) || 0,
        Math.max(0, maxDiscount - lineDiscountTotal),
    );
    const taxable = Math.max(0, subtotal - discountTotal);
    const tax = Math.floor((taxable * tax_rate) / 100);
    const rawGrand = taxable + tax;
    const grand =
        rounding_unit > 1
            ? Math.ceil(rawGrand / rounding_unit) * rounding_unit
            : rawGrand;
    const paid = payments.reduce(
        (sum, row) => sum + (Number(row.amount) || 0),
        0,
    );
    const change = Math.max(0, paid - grand);
    const canPay =
        cart.length > 0 &&
        !processing &&
        paid >= grand &&
        grand > 0 &&
        openSession !== null;

    const payHint =
        cart.length === 0
            ? null
            : openSession === null
              ? 'Buka sesi kas terlebih dahulu.'
              : paid < grand
                ? `Kurang ${formatIDR(grand - paid)} lagi.`
                : null;

    function addTile(tile: Tile) {
        setCart((lines) => {
            const existing = lines.find((line) => line.key === tile.key);

            if (existing) {
                if (
                    tile.track &&
                    tile.stock !== null &&
                    existing.qty + 1 > tile.stock
                ) {
                    return lines;
                }

                return lines.map((line) =>
                    line.key === tile.key
                        ? { ...line, qty: line.qty + 1 }
                        : line,
                );
            }

            if (tile.track && tile.stock !== null && tile.stock < 1) {
                return lines;
            }

            return [...lines, { ...tile, qty: 1, discount: 0 }];
        });
    }

    function scanBarcode() {
        const q = query.trim().toLowerCase();

        if (!q) {
            return;
        }

        const match = tiles.find(
            (tile) =>
                tile.sub.toLowerCase() === q ||
                tile.sub.toLowerCase().split(' · ').pop() === q,
        );

        const byBarcode = products.some(
            (p) =>
                p.barcode?.toLowerCase() === q ||
                p.variants.some((v) => v.barcode?.toLowerCase() === q),
        );

        if (match && byBarcode) {
            addTile(match);
            setQuery('');
        }
    }

    function setQty(key: string, qty: number) {
        setCart((lines) =>
            lines
                .map((line) => {
                    if (line.key !== key) {
                        return line;
                    }

                    const next = Number.isFinite(qty) ? Math.max(0, qty) : 0;

                    if (
                        line.track &&
                        line.stock !== null &&
                        next > line.stock
                    ) {
                        return { ...line, qty: line.stock };
                    }

                    return { ...line, qty: next };
                })
                .filter((line) => line.qty > 0),
        );
    }

    function setLineDiscount(key: string, discount: number) {
        setCart((lines) =>
            lines.map((line) => {
                if (line.key !== key) {
                    return line;
                }

                const otherDiscount = lines.reduce(
                    (sum, currentLine) =>
                        currentLine.key === key
                            ? sum
                            : sum + currentLine.discount,
                    0,
                );
                const max = Math.min(
                    line.qty * line.price,
                    Math.max(
                        0,
                        maxDiscount -
                            otherDiscount -
                            (Number(cartDiscount) || 0),
                    ),
                );

                return {
                    ...line,
                    discount: Math.min(Math.max(0, discount), max),
                };
            }),
        );
    }

    function updatePay(key: number, patch: Partial<PayRow>) {
        setPayments((rows) =>
            rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
        );
    }

    function exactCash() {
        setPayments((rows) => {
            if (rows.length === 0) {
                rowKey += 1;

                return [
                    {
                        key: rowKey,
                        method: defaultPaymentMethod,
                        amount: grand.toString(),
                        reference_no: '',
                    },
                ];
            }

            return rows.map((row, i) =>
                i === 0
                    ? {
                          ...row,
                          method: defaultPaymentMethod,
                          amount: grand.toString(),
                      }
                    : row,
            );
        });
    }

    function submit() {
        setProcessing(true);

        router.post(
            checkout.url(),
            {
                customer_id: customerId || null,
                discount_total: canDiscount ? Number(cartDiscount) || 0 : 0,
                items: cart.map((line) => ({
                    product_id: line.product_id,
                    variant_id: line.variant_id,
                    qty: line.qty,
                    discount: canDiscount ? line.discount : 0,
                })),
                payments: payments.map((row) => ({
                    method: row.method,
                    amount: Number(row.amount) || 0,
                    reference_no: row.reference_no || null,
                })),
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
            },
        );
    }

    const errorMessages = Object.values(errors ?? {});

    return (
        <>
            <Head title="Kasir" />

            {errorMessages.length > 0 && (
                <Alert variant="destructive">
                    <AlertDescription>
                        <ul className="list-disc space-y-0.5 pl-4">
                            {errorMessages.map((message, i) => (
                                <li key={i}>{String(message)}</li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            {openSession === null && (
                <Alert>
                    <Wallet className="size-4" />
                    <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                            Sesi kas belum dibuka. Transaksi tidak dapat
                            diproses.
                        </span>
                        <Button size="sm" asChild>
                            <Link href={sessionsIndex()}>Buka Sesi Kas</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid items-start gap-4 xl:grid-cols-[1fr_380px]">
                <Card>
                    <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
                        <div className="relative flex-1">
                            <ScanBarcode className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        scanBarcode();
                                    }
                                }}
                                placeholder="Cari nama / SKU, atau scan barcode lalu Enter..."
                                className="pl-9"
                                aria-label="Cari produk"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-10 text-center">
                                <Package className="size-8 text-muted-foreground" />
                                <p className="text-sm font-medium">
                                    Produk tidak ditemukan
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Coba kata kunci lain.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-4">
                                {filtered.map((tile) => {
                                    const empty =
                                        tile.track &&
                                        tile.stock !== null &&
                                        tile.stock < 1;

                                    return (
                                        <button
                                            key={tile.key}
                                            type="button"
                                            disabled={empty}
                                            onClick={() => addTile(tile)}
                                            className="flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <span className="line-clamp-2 w-full text-sm font-medium">
                                                {tile.name}
                                            </span>
                                            <span className="w-full truncate text-xs text-muted-foreground">
                                                {tile.sub}
                                            </span>
                                            <span className="mt-1 text-sm font-semibold tabular-nums">
                                                {formatIDR(tile.price)}
                                            </span>
                                            {tile.track ? (
                                                <Badge
                                                    variant={
                                                        empty
                                                            ? 'destructive'
                                                            : 'secondary'
                                                    }
                                                    className="tabular-nums"
                                                >
                                                    Stok {formatQty(tile.stock)}{' '}
                                                    {tile.unit}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline">
                                                    Tanpa stok
                                                </Badge>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="xl:sticky xl:top-4">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base font-medium">
                            <ShoppingCart className="size-4" />
                            Keranjang
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {store.name}
                        </p>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {cart.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                                Keranjang kosong. Ketuk produk untuk
                                menambahkan.
                            </p>
                        ) : (
                            <ul className="grid max-h-64 gap-3 overflow-y-auto pr-1">
                                {cart.map((line) => {
                                    const step = line.whole ? 1 : 0.1;

                                    return (
                                        <li
                                            key={line.key}
                                            className="grid gap-1.5 rounded-lg border p-3"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">
                                                        {line.name}
                                                    </p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {line.variant_id
                                                            ? `${line.sub} · `
                                                            : ''}
                                                        {formatQty(line.qty)}{' '}
                                                        {line.unit} ·{' '}
                                                        {formatIDR(
                                                            Math.round(
                                                                line.price,
                                                            ),
                                                        )}
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7"
                                                    onClick={() =>
                                                        setCart((lines) =>
                                                            lines.filter(
                                                                (l) =>
                                                                    l.key !==
                                                                    line.key,
                                                            ),
                                                        )
                                                    }
                                                    aria-label={`Hapus ${line.name}`}
                                                >
                                                    <Trash2 className="size-4 text-destructive" />
                                                </Button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="size-7"
                                                    onClick={() =>
                                                        setQty(
                                                            line.key,
                                                            Math.round(
                                                                (line.qty -
                                                                    step) *
                                                                    1000,
                                                            ) / 1000,
                                                        )
                                                    }
                                                    aria-label="Kurangi"
                                                >
                                                    <Minus className="size-3" />
                                                </Button>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step={line.whole ? 1 : 0.01}
                                                    value={line.qty}
                                                    onChange={(e) =>
                                                        setQty(
                                                            line.key,
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    className="h-7 w-20 text-center tabular-nums"
                                                    aria-label={`Jumlah (${line.unit})`}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="size-7"
                                                    onClick={() =>
                                                        setQty(
                                                            line.key,
                                                            Math.round(
                                                                (line.qty +
                                                                    step) *
                                                                    1000,
                                                            ) / 1000,
                                                        )
                                                    }
                                                    aria-label="Tambah"
                                                >
                                                    <Plus className="size-3" />
                                                </Button>
                                                {canDiscount && (
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={
                                                            line.discount || ''
                                                        }
                                                        onChange={(e) =>
                                                            setLineDiscount(
                                                                line.key,
                                                                Number(
                                                                    e.target
                                                                        .value,
                                                                ) || 0,
                                                            )
                                                        }
                                                        placeholder="Diskon"
                                                        title="Diskon baris (Rp)"
                                                        className="ml-auto h-7 w-24 tabular-nums"
                                                        aria-label="Diskon baris"
                                                    />
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="pos-customer">
                                Pelanggan (opsional)
                            </Label>
                            <select
                                id="pos-customer"
                                value={customerId}
                                onChange={(e) => setCustomerId(e.target.value)}
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                                <option value="">— Umum —</option>
                                {customers.map((customer) => (
                                    <option
                                        key={customer.id}
                                        value={customer.id}
                                    >
                                        {customer.name}
                                        {customer.phone
                                            ? ` · ${customer.phone}`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {canDiscount && (
                            <div className="grid gap-2">
                                <Label htmlFor="pos-discount">
                                    Diskon belanja (Rp)
                                </Label>
                                <Input
                                    id="pos-discount"
                                    type="number"
                                    min={0}
                                    max={Math.max(
                                        0,
                                        maxDiscount - lineDiscountTotal,
                                    )}
                                    value={cartDiscount}
                                    onChange={(e) =>
                                        setCartDiscount(e.target.value)
                                    }
                                    className="tabular-nums"
                                />
                            </div>
                        )}

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label>Pembayaran</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={exactCash}
                                >
                                    <Banknote className="size-3" />
                                    Uang pas
                                </Button>
                            </div>
                            {payments.map((row) => (
                                <div key={row.key} className="flex gap-2">
                                    <select
                                        value={row.method}
                                        onChange={(e) =>
                                            updatePay(row.key, {
                                                method: e.target.value,
                                            })
                                        }
                                        aria-label="Metode bayar"
                                        className="flex h-9 w-28 shrink-0 items-center justify-between rounded-md border border-input bg-transparent px-2 py-2 text-sm shadow-xs outline-none focus-visible:border-ring"
                                    >
                                        {paymentMethods.map((method) => (
                                            <option
                                                key={method.value}
                                                value={method.value}
                                            >
                                                {method.label}
                                            </option>
                                        ))}
                                    </select>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={row.amount}
                                        onChange={(e) =>
                                            updatePay(row.key, {
                                                amount: e.target.value,
                                            })
                                        }
                                        placeholder="Nominal"
                                        className="tabular-nums"
                                        aria-label="Nominal bayar"
                                    />
                                    {payments.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                setPayments((rows) =>
                                                    rows.filter(
                                                        (r) =>
                                                            r.key !== row.key,
                                                    ),
                                                )
                                            }
                                            aria-label="Hapus pembayaran"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    rowKey += 1;
                                    setPayments((rows) => [
                                        ...rows,
                                        {
                                            key: rowKey,
                                            method: defaultPaymentMethod,
                                            amount: '',
                                            reference_no: '',
                                        },
                                    ]);
                                }}
                            >
                                <Plus className="size-4" />
                                Split bayar
                            </Button>
                        </div>

                        <dl className="grid gap-1 border-t pt-3 text-sm tabular-nums">
                            <div className="flex justify-between text-muted-foreground">
                                <dt>Subtotal</dt>
                                <dd>{formatIDR(subtotal)}</dd>
                            </div>
                            {lineDiscountTotal > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                    <dt>Diskon item</dt>
                                    <dd>−{formatIDR(lineDiscountTotal)}</dd>
                                </div>
                            )}
                            {discountTotal > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                    <dt>Diskon belanja</dt>
                                    <dd>−{formatIDR(discountTotal)}</dd>
                                </div>
                            )}
                            <div className="flex justify-between text-muted-foreground">
                                <dt>
                                    Pajak (
                                    {tax_rate.toString().replace('.', ',')}%)
                                </dt>
                                <dd>+{formatIDR(tax)}</dd>
                            </div>
                            <div className="flex justify-between text-base font-semibold">
                                <dt>Total</dt>
                                <dd>{formatIDR(grand)}</dd>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <dt>Bayar</dt>
                                <dd>{formatIDR(paid)}</dd>
                            </div>
                            <div className="flex justify-between font-medium">
                                <dt>Kembali</dt>
                                <dd>{formatIDR(change)}</dd>
                            </div>
                        </dl>

                        <Button
                            type="button"
                            size="lg"
                            className="w-full"
                            disabled={!canPay}
                            onClick={submit}
                        >
                            {processing && <Spinner />}
                            Bayar {formatIDR(grand)}
                        </Button>
                        {payHint !== null && (
                            <p className="text-center text-xs text-muted-foreground">
                                {payHint}
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

PosIndex.layout = {
    title: 'Kasir',
    description: 'Catat penjualan baru dengan cepat.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Kasir',
        },
    ],
};
