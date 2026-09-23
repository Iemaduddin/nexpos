<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaleReturn\StoreSaleReturnRequest;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\StockLevel;
use App\Models\StockMovement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SaleReturnController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        Gate::authorize('viewAny', SaleReturn::class);

        $returns = SaleReturn::query()
            ->with(['sale:id,number', 'store:id,name', 'creator:id,name'])
            ->orderByDesc('id')
            ->paginate(10);

        return Inertia::render('returns/index', [
            'returns' => $returns,
        ]);
    }

    /**
     * Show the form for creating a return for the given sale.
     */
    public function create(Sale $sale): Response|RedirectResponse
    {
        Gate::authorize('create', [SaleReturn::class, $sale]);

        if (! in_array($sale->status, ['completed', 'partial_refund'], true)) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Hanya transaksi selesai yang dapat diretur.']);

            return to_route('sales.show', $sale);
        }

        $sale->load(['items.product:id,name,sku', 'items.variant:id,name,sku', 'returns.items']);

        $returnedQty = [];

        foreach ($sale->returns as $saleReturn) {
            foreach ($saleReturn->items as $returnItem) {
                $returnedQty[$returnItem->sale_item_id] = ($returnedQty[$returnItem->sale_item_id] ?? 0) + $returnItem->qty;
            }
        }

        $items = [];

        foreach ($sale->items as $item) {
            $variantName = $item->variant_id !== null
                ? $item->variant->name
                : null;
            $sku = $item->variant_id !== null
                ? $item->variant->sku
                : $item->product->sku;

            $items[] = [
                'id' => $item->id,
                'name' => $item->product->name,
                'variant' => $variantName,
                'sku' => $sku,
                'qty' => $item->qty,
                'qty_returned' => $returnedQty[$item->id] ?? 0,
                'unit_price' => $item->unit_price,
                'discount' => $item->discount,
            ];
        }

        return Inertia::render('returns/create', [
            'sale' => $sale->only(['id', 'number', 'status']),
            'items' => $items,
        ]);
    }

    /**
     * Store a newly created return and restore stock.
     */
    public function store(StoreSaleReturnRequest $request, Sale $sale): RedirectResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        if ($this->totalQty($validated) <= 0) {
            throw ValidationException::withMessages([
                'items' => 'Pilih minimal satu item untuk diretur.',
            ]);
        }

        DB::transaction(function () use ($validated, $user, $sale): void {
            $return = SaleReturn::create([
                'number' => 'TMP-'.$sale->id.'-'.now()->format('YmdHis'),
                'sale_id' => $sale->id,
                'store_id' => $sale->store_id,
                'reason' => $validated['reason'],
                'total_refund' => 0,
                'created_by' => $user->id,
            ]);

            $totalRefund = 0;
            $rows = $validated['items'] ?? [];

            if (! is_array($rows)) {
                return;
            }

            foreach ($rows as $row) {
                if (! is_array($row)) {
                    continue;
                }

                $item = $sale->items()->findOrFail((int) ($row['sale_item_id'] ?? 0));
                $qty = (float) ($row['qty'] ?? 0);

                if ($qty <= 0) {
                    continue;
                }

                $discountPerUnit = $item->qty > 0 ? $item->discount / $item->qty : 0;
                $refund = (int) round($qty * $item->unit_price - $qty * $discountPerUnit);
                $totalRefund += $refund;

                $return->items()->create([
                    'sale_return_id' => $return->id,
                    'sale_item_id' => $item->id,
                    'product_id' => $item->product_id,
                    'variant_id' => $item->variant_id,
                    'qty' => $qty,
                    'refund_amount' => $refund,
                ]);

                $product = $item->product;

                if ($product->track_inventory) {
                    $level = StockLevel::firstOrCreate([
                        'store_id' => $sale->store_id,
                        'product_id' => $item->product_id,
                        'variant_id' => $item->variant_id,
                    ], ['qty_on_hand' => 0, 'qty_reserved' => 0]);

                    $before = $level->qty_on_hand;
                    $level->increment('qty_on_hand', $qty);

                    StockMovement::create([
                        'product_id' => $item->product_id,
                        'variant_id' => $item->variant_id,
                        'store_id' => $sale->store_id,
                        'type' => 'sale_return',
                        'reference_type' => 'sale_return',
                        'reference_id' => $return->id,
                        'qty_change' => $qty,
                        'qty_before' => $before,
                        'qty_after' => $before + $qty,
                        'unit_cost' => $item->cost_price,
                        'notes' => "Retur {$sale->number}",
                        'created_by' => $user->id,
                    ]);
                }
            }

            $return->update([
                'number' => sprintf('RTN-%s-%04d', now()->format('Ymd'), $return->id),
                'total_refund' => $totalRefund,
            ]);

            $orderedQty = $sale->items()->sum('qty');
            $returnedQty = $sale->returns()->with('items')->get()->flatMap->items->sum('qty');

            $sale->update([
                'status' => $returnedQty >= $orderedQty ? 'refunded' : 'partial_refund',
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Retur berhasil dicatat dan stok dikembalikan.']);

        return to_route('sales.show', $sale);
    }

    /**
     * Total return quantity in the request.
     *
     * @param  array<string, mixed>  $validated
     */
    private function totalQty(array $validated): float
    {
        $rows = $validated['items'] ?? [];

        if (! is_array($rows)) {
            return 0.0;
        }

        $total = 0.0;

        foreach ($rows as $row) {
            if (is_array($row)) {
                $total += (float) ($row['qty'] ?? 0);
            }
        }

        return $total;
    }
}
