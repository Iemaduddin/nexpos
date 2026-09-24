<?php

namespace App\Http\Controllers;

use App\Http\Requests\Sale\StoreSaleRequest;
use App\Models\BusinessSetting;
use App\Models\CashSession;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\Store;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SaleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Sale::class);

        $search = $request->string('search')->toString();
        $status = $request->string('status')->toString();

        $sales = Sale::query()
            ->with(['customer:id,name', 'cashier:id,name', 'store:id,name'])
            ->when($search, fn ($query) => $query->where('number', 'like', "%{$search}%"))
            ->when($status, fn ($query) => $query->where('status', $status))
            ->orderByDesc('id')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('sales/index', [
            'sales' => $sales,
            'filters' => ['search' => $search, 'status' => $status ?: null],
        ]);
    }

    /**
     * Show the POS cashier page.
     */
    public function pos(Request $request): Response
    {
        Gate::authorize('create', Sale::class);

        $settings = BusinessSetting::first();

        $store = $request->user()->store ?? Store::query()->where('is_main', true)->first()
            ?? Store::query()->orderBy('id')->firstOrFail();

        $products = Product::query()
            ->where('is_active', true)
            ->with(['variants' => fn ($q) => $q->where('is_active', true), 'unit:id,symbol', 'category:id,name'])
            ->orderBy('name')
            ->get(['id', 'name', 'sku', 'barcode', 'selling_price', 'track_inventory', 'unit_id', 'category_id']);

        $levels = StockLevel::query()
            ->where('store_id', $store->id)
            ->whereIn('product_id', $products->pluck('id'))
            ->get(['product_id', 'variant_id', 'qty_on_hand']);

        $stockMap = [];

        foreach ($levels as $level) {
            $stockMap[$level->product_id.':'.($level->variant_id ?? 0)] = (float) $level->qty_on_hand;
        }

        $stockOf = fn (?int $productId, mixed $variantId): float => $stockMap[$productId.':'.((int) ($variantId ?? 0))] ?? 0.0;

        return Inertia::render('pos/index', [
            'store' => $store->only(['id', 'name']),
            'openSession' => CashSession::query()
                ->where('store_id', $store->id)
                ->where('status', 'open')
                ->latest('opened_at')
                ->first(['id', 'opened_at'])?->only(['id', 'opened_at']),
            'tax_rate' => $this->taxRate(),
            'payment_methods' => $settings?->enabledPaymentMethods()
                ?? BusinessSetting::DEFAULT_PAYMENT_METHODS,
            'rounding_unit' => (int) ($settings?->rounding_unit ?? 1),
            'max_discount_percent' => (float) ($settings?->max_discount_percent ?? 100),
            'customers' => Customer::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'phone']),
            'products' => $products->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'barcode' => $p->barcode,
                'category' => ['id' => $p->category_id, 'name' => $p->category?->name ?? 'Tanpa kategori'],
                'selling_price' => $p->selling_price,
                'track_inventory' => $p->track_inventory,
                'unit' => $p->unit->symbol,
                'stock' => $p->track_inventory ? $stockOf($p->id, null) : null,
                'variants' => $p->variants->map(fn ($v) => [
                    'id' => $v->id,
                    'name' => $v->name,
                    'sku' => $v->sku,
                    'barcode' => $v->barcode,
                    'selling_price' => $v->selling_price,
                    'stock' => $p->track_inventory ? $stockOf($p->id, $v->id) : null,
                ])->values(),
            ]),
        ]);
    }

    /**
     * Checkout the cart into a completed sale.
     */
    public function checkout(StoreSaleRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        $store = $user->store ?? Store::query()->where('is_main', true)->first()
            ?? Store::query()->orderBy('id')->firstOrFail();
        $settings = BusinessSetting::first();
        $taxRate = (float) ($settings?->default_tax_rate ?? 0);
        $roundingUnit = (int) ($settings?->rounding_unit ?? 1);
        $maxDiscountPercent = (float) ($settings?->max_discount_percent ?? 100);

        $session = CashSession::query()
            ->where('store_id', $store->id)
            ->where('status', 'open')
            ->latest('opened_at')
            ->first();

        if (! $session) {
            throw ValidationException::withMessages([
                'session' => 'Buka sesi kas terlebih dahulu sebelum berjualan.',
            ]);
        }

        $sale = DB::transaction(function () use ($validated, $user, $store, $session, $taxRate, $roundingUnit, $maxDiscountPercent) {
            $lines = [];
            $subtotal = 0;
            $grossSubtotal = 0;

            $rows = $validated['items'] ?? [];

            if (! is_array($rows)) {
                throw ValidationException::withMessages(['items' => 'Item belanja tidak valid.']);
            }

            foreach (array_values($rows) as $i => $row) {
                if (! is_array($row)) {
                    continue;
                }

                $product = Product::query()->findOrFail((int) ($row['product_id'] ?? 0));
                $variantId = isset($row['variant_id']) ? (int) $row['variant_id'] : null;
                $qty = (float) ($row['qty'] ?? 0);

                // Price always follows master data; only discount is adjustable.
                $unitPrice = $variantId !== null
                    ? $product->variants()->where('id', $variantId)->firstOrFail()->selling_price
                    : $product->selling_price;

                $lineDiscount = min((int) ($row['discount'] ?? 0), (int) round($qty * $unitPrice));
                $lineGross = (int) round($qty * $unitPrice);
                $lineSubtotal = $lineGross - $lineDiscount;
                $grossSubtotal += $lineGross;
                $subtotal += $lineSubtotal;

                if ($product->track_inventory) {
                    $available = (float) (StockLevel::query()
                        ->where('store_id', $store->id)
                        ->where('product_id', $product->id)
                        ->where('variant_id', $variantId)
                        ->lockForUpdate()
                        ->value('qty_on_hand') ?? 0);

                    if ($qty > $available) {
                        throw ValidationException::withMessages([
                            "items.{$i}.qty" => "Stok {$product->name} tidak cukup (tersedia {$this->formatQty($available)}).",
                        ]);
                    }
                }

                $lines[] = [
                    'product' => $product,
                    'variant_id' => $variantId,
                    'qty' => $qty,
                    'unit_price' => $unitPrice,
                    'cost_price' => $variantId !== null
                        ? $product->variants()->where('id', $variantId)->firstOrFail()->cost_price
                        : $product->cost_price,
                    'discount' => $lineDiscount,
                    'subtotal' => $lineSubtotal,
                ];
            }

            $cartDiscount = min((int) ($validated['discount_total'] ?? 0), $subtotal);

            $totalDiscount = $cartDiscount + (int) collect($lines)->sum('discount');
            $maxDiscount = (int) floor($grossSubtotal * $maxDiscountPercent / 100);

            if ($totalDiscount > $maxDiscount) {
                throw ValidationException::withMessages([
                    'discount_total' => "Total diskon tidak boleh melebihi {$maxDiscountPercent}% dari subtotal.",
                ]);
            }

            if ($totalDiscount > 0) {
                if (! $user->can('sales.discount')) {
                    throw ValidationException::withMessages([
                        'discount_total' => 'Diskon hanya dapat diberikan oleh manager.',
                    ]);
                }
            }

            $taxable = $subtotal - $cartDiscount;
            $tax = (int) floor($taxable * $taxRate / 100);
            $grand = $this->roundTotal($taxable + $tax, $roundingUnit);

            $paid = 0;
            $payments = $validated['payments'] ?? [];

            if (is_array($payments)) {
                foreach ($payments as $payment) {
                    if (is_array($payment)) {
                        $paid += (int) ($payment['amount'] ?? 0);
                    }
                }
            }

            if ($paid < $grand) {
                throw ValidationException::withMessages([
                    'payments' => 'Jumlah bayar kurang dari total belanja.',
                ]);
            }

            $sale = Sale::create([
                'number' => 'TMP-'.$user->id.'-'.now()->format('YmdHis'),
                'store_id' => $store->id,
                'customer_id' => $validated['customer_id'] ?? null,
                'cashier_id' => $user->id,
                'cash_session_id' => $session->id,
                'status' => 'completed',
                'subtotal' => $subtotal,
                'discount_total' => $cartDiscount,
                'tax_total' => $tax,
                'grand_total' => $grand,
                'paid_total' => $paid,
                'change_amount' => $paid - $grand,
                'completed_at' => now(),
                'notes' => $validated['notes'] ?? null,
            ]);

            $sale->update(['number' => sprintf('TRX-%s-%04d', now()->format('Ymd'), $sale->id)]);

            $paymentRows = $validated['payments'] ?? [];

            if (is_array($paymentRows)) {
                foreach ($paymentRows as $payment) {
                    if (! is_array($payment)) {
                        continue;
                    }

                    $sale->payments()->create([
                        'sale_id' => $sale->id,
                        'method' => (string) ($payment['method'] ?? 'cash'),
                        'amount' => (int) ($payment['amount'] ?? 0),
                        'reference_no' => isset($payment['reference_no']) ? (string) $payment['reference_no'] : null,
                        'paid_at' => now(),
                        'created_by' => $user->id,
                    ]);
                }
            }

            foreach ($lines as $line) {
                $product = $line['product'];

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'variant_id' => $line['variant_id'],
                    'qty' => $line['qty'],
                    'unit_price' => $line['unit_price'],
                    'cost_price' => $line['cost_price'],
                    'discount' => $line['discount'],
                    'subtotal' => $line['subtotal'],
                ]);

                if (! $product->track_inventory) {
                    continue;
                }

                $level = StockLevel::query()
                    ->where('store_id', $store->id)
                    ->where('product_id', $product->id)
                    ->where('variant_id', $line['variant_id'])
                    ->lockForUpdate()
                    ->firstOrFail();

                $before = $level->qty_on_hand;
                $level->decrement('qty_on_hand', $line['qty']);

                StockMovement::create([
                    'product_id' => $product->id,
                    'variant_id' => $line['variant_id'],
                    'store_id' => $store->id,
                    'type' => 'sale',
                    'reference_type' => 'sale',
                    'reference_id' => $sale->id,
                    'qty_change' => -$line['qty'],
                    'qty_before' => $before,
                    'qty_after' => $before - $line['qty'],
                    'unit_cost' => $line['cost_price'],
                    'notes' => "Penjualan {$sale->number}",
                    'created_by' => $user->id,
                ]);
            }

            if ($sale->customer_id) {
                $sale->customer()->increment('transaction_count');
                $sale->customer()->increment('total_spent', $grand);
            }

            return $sale;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "Transaksi {$sale->number} berhasil."]);

        return to_route('sales.show', $sale);
    }

    /**
     * Active business tax rate, 0 when settings are missing.
     */
    private function taxRate(): float
    {
        $settings = BusinessSetting::first();

        if ($settings === null) {
            return 0.0;
        }

        return (float) $settings->default_tax_rate;
    }

    /**
     * Round a payable total up to the configured currency unit.
     */
    private function roundTotal(int $amount, int $unit): int
    {
        if ($unit <= 1) {
            return $amount;
        }

        return (int) (ceil($amount / $unit) * $unit);
    }

    /**
     * Trim quantity for messages (500.500 → 500.5).
     */
    private function formatQty(float $qty): string
    {
        $text = rtrim(rtrim(number_format($qty, 3, '.', ''), '0'), '.');

        return $text === '' ? '0' : $text;
    }

    /**
     * Display the specified resource with receipt.
     */
    public function show(Sale $sale): Response
    {
        Gate::authorize('view', $sale);

        $sale->load([
            'store:id,name',
            'customer:id,name,phone',
            'cashier:id,name',
            'items.product:id,name,sku',
            'items.variant:id,name,sku',
            'payments',
            'returns.items',
        ]);

        return Inertia::render('sales/show', [
            'sale' => $sale,
            'business' => BusinessSetting::first()?->only([
                'name', 'address', 'phone', 'receipt_header', 'receipt_footer',
            ]),
        ]);
    }
}
