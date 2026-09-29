<?php

namespace App\Http\Controllers;

use App\Http\Requests\Sale\StoreSaleRequest;
use App\Models\BusinessSetting;
use App\Models\CashSession;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StockLevel;
use App\Models\Store;
use App\Services\CheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
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
     * Show the customer-facing display (second monitor, same device).
     * Live cart state is mirrored from the cashier page via localStorage.
     */
    public function display(Request $request): Response
    {
        Gate::authorize('viewAny', Sale::class);

        $store = $request->user()->store ?? Store::query()->where('is_main', true)->first()
            ?? Store::query()->orderBy('id')->firstOrFail();

        return Inertia::render('pos/display', [
            'store' => $store->only(['id', 'name']),
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
            'snapshot_at' => now()->toISOString(),
            'store' => $store->only(['id', 'name']),
            'openSession' => CashSession::query()
                ->where('store_id', $store->id)
                ->where('status', 'open')
                ->latest('opened_at')
                ->first(['id', 'opened_at'])?->only(['id', 'opened_at']),
            'tax_rate' => $this->taxRate(),
            'payment_methods' => $settings === null
                ? BusinessSetting::DEFAULT_PAYMENT_METHODS
                : $settings->enabledPaymentMethods(),
            'rounding_unit' => $settings === null ? 1 : (int) $settings->rounding_unit,
            'max_discount_percent' => $settings === null ? 100.0 : (float) $settings->max_discount_percent,
            'customers' => Customer::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'phone']),
            'products' => $products->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'barcode' => $p->barcode,
                'category' => ['id' => $p->category_id, 'name' => $p->category->name ?? 'Tanpa kategori'],
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
    public function checkout(StoreSaleRequest $request, CheckoutService $checkout): RedirectResponse|JsonResponse
    {
        $validated = $request->validated();

        $sale = $checkout->checkout(
            $request->user(),
            $validated,
            $request->header('X-Idempotency-Key') ?: ($validated['idempotency_key'] ?? null),
        );

        if ($request->wantsJson()) {
            $sale->loadMissing([
                'items.product:id,name',
                'items.variant:id,name',
                'payments:id,sale_id,method,amount,reference_no',
                'customer:id,name',
                'cashier:id,name',
                'store:id,name',
            ]);

            return response()->json([
                'sale' => [
                    'id' => $sale->id,
                    'number' => $sale->number,
                    'completed_at' => $sale->completed_at?->toISOString(),
                    'store' => $sale->store?->name,
                    'cashier' => $sale->cashier?->name,
                    'customer' => $sale->customer?->name,
                    'subtotal' => $sale->subtotal,
                    'discount_total' => $sale->discount_total,
                    'tax_total' => $sale->tax_total,
                    'grand_total' => $sale->grand_total,
                    'paid_total' => $sale->paid_total,
                    'change_amount' => $sale->change_amount,
                    'url' => route('sales.show', $sale),
                    'items' => $sale->items->map(fn ($item) => [
                        'name' => $item->product->name ?? '-',
                        'variant' => $item->variant?->name,
                        'qty' => $item->qty,
                        'unit_price' => $item->unit_price,
                        'discount' => $item->discount,
                        'subtotal' => $item->subtotal,
                    ])->values(),
                    'payments' => $sale->payments->map(fn ($payment) => [
                        'method' => $payment->method,
                        'amount' => $payment->amount,
                        'reference_no' => $payment->reference_no,
                    ])->values(),
                ],
            ], 201);
        }

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
