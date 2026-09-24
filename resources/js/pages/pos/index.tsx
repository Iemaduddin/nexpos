import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Banknote,
    Minus,
    Package,
    Pause,
    Play,
    Plus,
    ScanBarcode,
    ShoppingCart,
    Trash2,
    UserPlus,
    Wallet,
} from 'lucide-react';
import { quickStore as quickCustomerStore } from '@/actions/App/Http/Controllers/CustomerController';
import { checkout } from '@/actions/App/Http/Controllers/SaleController';
import { index as sessionsIndex } from '@/actions/App/Http/Controllers/CashSessionController';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/sonner';
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
    barcode: string | null;
    categoryId: number | null;
    categoryName: string;
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

const QUICK_CASH = [10000, 20000, 50000, 100000];

const HELD_KEY = 'nexpos:pos:held:v1';

type HeldSale = {
    id: string;
    savedAt: number;
    customerId: string;
    cart: CartLine[];
    cartDiscount: string;
    discountMode: 'rp' | 'pct';
    total: number;
    count: number;
};

function readHeldSales(): HeldSale[] {
    try {
        const raw = localStorage.getItem(HELD_KEY);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw) as HeldSale[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function xsrfToken(): string | null {
    const found = document.cookie
        .split('; ')
        .find((part) => part.startsWith('XSRF-TOKEN='));
    return found ? decodeURIComponent(found.split('=')[1]) : null;
}

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
    const [discountMode, setDiscountMode] = useState<'rp' | 'pct'>('rp');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [payments, setPayments] = useState<PayRow[]>([
        {
            key: 0,
            method: defaultPaymentMethod,
            amount: '',
            reference_no: '',
        },
    ]);
    const [processing, setProcessing] = useState(false);
    const [held, setHeld] = useState<HeldSale[]>(() => readHeldSales());
    const [holdOpen, setHoldOpen] = useState(false);
    const [quickOpen, setQuickOpen] = useState(false);
    const [quickName, setQuickName] = useState('');
    const [quickPhone, setQuickPhone] = useState('');
    const [quickError, setQuickError] = useState('');
    const [quickSaving, setQuickSaving] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    const canManageCustomers = auth.permissions.includes('customers.manage');

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
                    barcode: product.barcode,
                    categoryId: product.category.id,
                    categoryName: product.category.name,
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
                        barcode: variant.barcode,
                        categoryId: product.category.id,
                        categoryName: product.category.name,
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

    const categories = useMemo(() => {
        const map = new Map<number | null, string>();
        for (const product of products) {
            if (!map.has(product.category.id)) {
                map.set(product.category.id, product.category.name);
            }
        }
        return [...map.entries()]
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name, 'id'));
    }, [products]);

    const filtered = useMemo(() => {
        const byCategory =
            categoryId === null
                ? tiles
                : tiles.filter((tile) => tile.categoryId === categoryId);
        const q = query.trim().toLowerCase();

        if (!q) {
            return byCategory;
        }

        return byCategory.filter((tile) =>
            [tile.name, tile.sub, tile.barcode ?? ''].some((field) =>
                field.toLowerCase().includes(q),
            ),
        );
    }, [tiles, query, categoryId]);

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
    const cartDiscountPct =
        discountMode === 'pct'
            ? Math.min(
                  Math.max(0, Number(cartDiscount) || 0),
                  max_discount_percent,
              )
            : 0;
    const cartDiscountRp =
        discountMode === 'pct'
            ? Math.floor(
                  (Math.max(0, subtotal - lineDiscountTotal) *
                      cartDiscountPct) /
                      100,
              )
            : Number(cartDiscount) || 0;
    const discountTotal = Math.min(
        cartDiscountRp,
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
        const existing = cart.find((line) => line.key === tile.key);
        const currentQty = existing?.qty ?? 0;

        if (tile.track && tile.stock !== null && currentQty + 1 > tile.stock) {
            toast.warning(
                `Stok ${tile.name} tersisa ${formatQty(tile.stock)} ${tile.unit}.`,
            );
            return;
        }

        setCart((lines) => {
            const found = lines.find((line) => line.key === tile.key);

            if (found) {
                return lines.map((line) =>
                    line.key === tile.key
                        ? { ...line, qty: line.qty + 1 }
                        : line,
                );
            }

            return [...lines, { ...tile, qty: 1, discount: 0 }];
        });
        searchRef.current?.focus();
    }

    function scanBarcode() {
        const q = query.trim().toLowerCase();

        if (!q) {
            return;
        }

        const match = tiles.find(
            (tile) =>
                tile.sub.toLowerCase() === q ||
                tile.sub.toLowerCase().split(' · ').pop() === q ||
                tile.barcode?.toLowerCase() === q,
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
                    Math.max(0, maxDiscount - otherDiscount - cartDiscountRp),
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

    function fillCash(amount: number) {
        setPayments((rows) => {
            if (rows.length === 0) {
                rowKey += 1;

                return [
                    {
                        key: rowKey,
                        method: 'cash',
                        amount: amount.toString(),
                        reference_no: '',
                    },
                ];
            }

            return rows.map((row, i) =>
                i === 0 ? { ...row, amount: amount.toString() } : row,
            );
        });
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
                discount_total: canDiscount ? discountTotal : 0,
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

    function resetTransaction() {
        setCart([]);
        setCustomerId('');
        setCartDiscount('');
        setDiscountMode('rp');
        setPayments([
            {
                key: 0,
                method: defaultPaymentMethod,
                amount: '',
                reference_no: '',
            },
        ]);
        setQuery('');
    }

    function holdTransaction() {
        if (cart.length === 0) {
            return;
        }
        const count = cart.reduce((sum, line) => sum + line.qty, 0);
        const entry: HeldSale = {
            id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
            savedAt: Date.now(),
            customerId,
            cart,
            cartDiscount,
            discountMode,
            total: grand,
            count,
        };
        setHeld((prev) => {
            const next = [entry, ...prev].slice(0, 20);
            try {
                localStorage.setItem(HELD_KEY, JSON.stringify(next));
            } catch {
                // abaikan keterbatasan penyimpanan lokal
            }
            return next;
        });
        resetTransaction();
        setHoldOpen(false);
        toast.success('Transaksi ditahan. Lanjutkan dari menu Antrian.');
    }

    function resumeHeld(entry: HeldSale) {
        setCart(entry.cart);
        setCustomerId(entry.customerId);
        setCartDiscount(entry.cartDiscount);
        setDiscountMode(entry.discountMode);
        setPayments([
            {
                key: 0,
                method: defaultPaymentMethod,
                amount: '',
                reference_no: '',
            },
        ]);
        setHoldOpen(false);
        setHeld((prev) => {
            const next = prev.filter((item) => item.id !== entry.id);
            try {
                localStorage.setItem(HELD_KEY, JSON.stringify(next));
            } catch {
                // abaikan keterbatasan penyimpanan lokal
            }
            return next;
        });
    }

    function dropHeld(id: string) {
        setHeld((prev) => {
            const next = prev.filter((item) => item.id !== id);
            try {
                localStorage.setItem(HELD_KEY, JSON.stringify(next));
            } catch {
                // abaikan keterbatasan penyimpanan lokal
            }
            return next;
        });
    }

    async function saveQuickCustomer() {
        if (!quickName.trim()) {
            setQuickError('Nama pelanggan wajib diisi.');
            return;
        }
        setQuickSaving(true);
        setQuickError('');
        try {
            const token = xsrfToken();
            const response = await fetch(quickCustomerStore.url(), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(token ? { 'X-XSRF-TOKEN': token } : {}),
                },
                body: JSON.stringify({
                    name: quickName.trim(),
                    phone: quickPhone.trim() || null,
                }),
            });
            if (response.status === 422) {
                const data = (await response.json()) as {
                    errors?: Record<string, string[]>;
                    message?: string;
                };
                const first = Object.values(data.errors ?? {})[0]?.[0];
                setQuickError(first ?? data.message ?? 'Data tidak valid.');
                return;
            }
            if (!response.ok) {
                throw new Error('failed');
            }
            const data = (await response.json()) as {
                customer: { id: number; name: string; phone?: string | null };
            };
            router.reload({
                only: ['customers'],
                onSuccess: () => {
                    setCustomerId(String(data.customer.id));
                    setQuickOpen(false);
                    setQuickName('');
                    setQuickPhone('');
                    toast.success(
                        `${data.customer.name} ditambahkan dan dipilih.`,
                    );
                },
            });
        } catch {
            setQuickError('Gagal menambah pelanggan. Coba lagi.');
        } finally {
            setQuickSaving(false);
        }
    }

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const typing =
                target &&
                ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
            if (e.key === '/' && !typing) {
                e.preventDefault();
                searchRef.current?.focus();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canPay) {
                e.preventDefault();
                submit();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    });

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
                                ref={searchRef}
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        scanBarcode();
                                    }
                                }}
                                placeholder="Cari nama / SKU / barcode, atau scan lalu Enter..."
                                className="pl-9"
                                aria-label="Cari produk"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-3 flex flex-wrap items-center gap-1.5">
                            <Button
                                type="button"
                                variant={
                                    categoryId === null ? 'default' : 'outline'
                                }
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setCategoryId(null)}
                            >
                                Semua
                            </Button>
                            {categories.map((category) => (
                                <Button
                                    key={category.id ?? 'none'}
                                    type="button"
                                    variant={
                                        categoryId === category.id
                                            ? 'default'
                                            : 'outline'
                                    }
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => setCategoryId(category.id)}
                                >
                                    {category.name}
                                </Button>
                            ))}
                            <span className="ml-auto hidden text-[11px] text-muted-foreground lg:block">
                                Tekan <kbd className="rounded border px-1">/</kbd> untuk cari · <kbd className="rounded border px-1">Ctrl+Enter</kbd> untuk bayar
                            </span>
                        </div>
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
                                            {tile.barcode &&
                                                !tile.sub
                                                    .toLowerCase()
                                                    .includes(
                                                        tile.barcode.toLowerCase(),
                                                    ) && (
                                                    <span className="w-full truncate text-[11px] text-muted-foreground/70">
                                                        #{tile.barcode}
                                                    </span>
                                                )}
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
                        <div className="flex items-center justify-between gap-2">
                            <CardTitle className="flex items-center gap-2 text-base font-medium">
                                <ShoppingCart className="size-4" />
                                Keranjang
                            </CardTitle>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    disabled={cart.length === 0}
                                    onClick={holdTransaction}
                                    title="Tahan transaksi ini dan lanjutkan nanti"
                                >
                                    <Pause className="size-3" />
                                    Tahan
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => setHoldOpen(true)}
                                >
                                    <Play className="size-3" />
                                    Antrian
                                    {held.length > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="ml-1 px-1 tabular-nums"
                                        >
                                            {held.length}
                                        </Badge>
                                    )}
                                </Button>
                            </div>
                        </div>
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
                                                    <CurrencyInput
                                                        value={line.discount}
                                                        onValueChange={(raw) =>
                                                            setLineDiscount(
                                                                line.key,
                                                                Number(raw) || 0,
                                                            )
                                                        }
                                                        placeholder="Diskon"
                                                        title="Diskon baris (Rp)"
                                                        wrapperClassName="ml-auto w-28"
                                                        className="h-7"
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
                            <div className="flex items-center justify-between">
                                <Label htmlFor="pos-customer">
                                    Pelanggan (opsional)
                                </Label>
                                {canManageCustomers && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => {
                                            setQuickError('');
                                            setQuickName('');
                                            setQuickPhone('');
                                            setQuickOpen(true);
                                        }}
                                    >
                                        <UserPlus className="size-3" />
                                        Baru
                                    </Button>
                                )}
                            </div>
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
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="pos-discount">
                                        Diskon belanja (
                                        {discountMode === 'pct' ? '%' : 'Rp'})
                                    </Label>
                                    <div className="flex overflow-hidden rounded-md border">
                                        {(['rp', 'pct'] as const).map(
                                            (mode) => (
                                                <button
                                                    key={mode}
                                                    type="button"
                                                    onClick={() => {
                                                        setDiscountMode(mode);
                                                        setCartDiscount('');
                                                    }}
                                                    aria-pressed={
                                                        discountMode === mode
                                                    }
                                                    className={`h-7 px-2.5 text-xs font-medium transition-colors ${
                                                        discountMode === mode
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'text-muted-foreground hover:bg-muted'
                                                    }`}
                                                >
                                                    {mode === 'rp'
                                                        ? 'Rp'
                                                        : '%'}
                                                </button>
                                            ),
                                        )}
                                    </div>
                                </div>
                                {discountMode === 'pct' ? (
                                    <Input
                                        id="pos-discount"
                                        type="number"
                                        min={0}
                                        max={max_discount_percent}
                                        value={cartDiscount}
                                        onChange={(e) =>
                                            setCartDiscount(e.target.value)
                                        }
                                        className="tabular-nums"
                                    />
                                ) : (
                                    <CurrencyInput
                                        id="pos-discount"
                                        value={cartDiscount}
                                        onValueChange={setCartDiscount}
                                        className="tabular-nums"
                                    />
                                )}
                                {discountMode === 'pct' &&
                                    discountTotal > 0 && (
                                        <p className="text-xs text-muted-foreground tabular-nums">
                                            ≈ {formatIDR(discountTotal)}
                                        </p>
                                    )}
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
                            <div className="flex flex-wrap gap-1.5">
                                {QUICK_CASH.map((amount) => (
                                    <Button
                                        key={amount}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 flex-1 text-xs tabular-nums"
                                        onClick={() => fillCash(amount)}
                                        title={`Isi ${formatIDR(amount)}`}
                                    >
                                        {amount >= 1000
                                            ? `${amount / 1000}rb`
                                            : formatIDR(amount)}
                                    </Button>
                                ))}
                            </div>
                            {payments.map((row) => (
                                <div key={row.key} className="grid gap-1.5">
                                    <div className="flex gap-2">
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
                                        <CurrencyInput
                                            value={row.amount}
                                            onValueChange={(raw) =>
                                                updatePay(row.key, {
                                                    amount: raw,
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
                                                                r.key !==
                                                                row.key,
                                                        ),
                                                    )
                                                }
                                                aria-label="Hapus pembayaran"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        )}
                                    </div>
                                    {row.method !== 'cash' && (
                                        <Input
                                            value={row.reference_no}
                                            onChange={(e) =>
                                                updatePay(row.key, {
                                                    reference_no: e.target.value,
                                                })
                                            }
                                            placeholder="No. referensi / approval"
                                            className="h-8 text-xs"
                                            aria-label="Nomor referensi pembayaran"
                                        />
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

            <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Transaksi ditahan</DialogTitle>
                        <DialogDescription>
                            Lanjutkan transaksi yang ditahan atau hapus jika
                            sudah tidak diperlukan.
                        </DialogDescription>
                    </DialogHeader>
                    {held.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                            Tidak ada transaksi yang ditahan.
                        </p>
                    ) : (
                        <ul className="grid max-h-80 gap-2 overflow-y-auto">
                            {held.map((entry) => (
                                <li
                                    key={entry.id}
                                    className="flex items-center gap-3 rounded-lg border p-3"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium tabular-nums">
                                            {new Date(
                                                entry.savedAt,
                                            ).toLocaleTimeString('id-ID', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}{' '}
                                            · {entry.count} item
                                        </p>
                                        <p className="text-xs text-muted-foreground tabular-nums">
                                            {formatIDR(entry.total)}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => resumeHeld(entry)}
                                    >
                                        <Play className="size-3" />
                                        Lanjutkan
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => dropHeld(entry.id)}
                                        aria-label="Hapus transaksi ditahan"
                                    >
                                        <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Tutup
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Pelanggan baru</DialogTitle>
                        <DialogDescription>
                            Tambah cepat tanpa meninggalkan kasir.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="quick-name">Nama</Label>
                            <Input
                                id="quick-name"
                                value={quickName}
                                onChange={(e) => setQuickName(e.target.value)}
                                placeholder="Nama pelanggan"
                                autoFocus
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="quick-phone">
                                Telepon (opsional)
                            </Label>
                            <Input
                                id="quick-phone"
                                value={quickPhone}
                                onChange={(e) => setQuickPhone(e.target.value)}
                                placeholder="08..."
                                inputMode="tel"
                            />
                        </div>
                        {quickError !== '' && (
                            <p className="text-sm text-destructive">
                                {quickError}
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Batal
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            disabled={quickSaving}
                            onClick={saveQuickCustomer}
                        >
                            {quickSaving && <Spinner />}
                            Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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
