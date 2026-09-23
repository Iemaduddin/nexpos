<?php

namespace App\Http\Controllers;

use App\Http\Requests\StockAdjustment\StoreStockAdjustmentRequest;
use App\Http\Requests\StockAdjustment\UpdateStockAdjustmentRequest;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\Store;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class StockAdjustmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', StockAdjustment::class);

        $search = $request->string('search')->toString();
        $status = $request->string('status')->toString();

        $adjustments = StockAdjustment::query()
            ->with(['store:id,name'])
            ->withCount('items')
            ->when($search, fn ($query) => $query->where('number', 'like', "%{$search}%"))
            ->when($status, fn ($query) => $query->where('status', $status))
            ->orderByDesc('id')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('adjustments/index', [
            'adjustments' => $adjustments,
            'filters' => ['search' => $search, 'status' => $status ?: null],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        Gate::authorize('create', StockAdjustment::class);

        return Inertia::render('adjustments/create', $this->formOptions());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreStockAdjustmentRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $request): void {
            $adjustment = StockAdjustment::create([
                'number' => 'TMP-'.Str::uuid(),
                'store_id' => $validated['store_id'],
                'type' => $validated['type'],
                'status' => 'draft',
                'reason' => $validated['reason'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            foreach ($validated['items'] as $row) {
                $adjustment->items()->create([
                    'product_id' => $row['product_id'],
                    'variant_id' => $row['variant_id'] ?? null,
                    'qty_system' => 0,
                    'qty_actual' => $row['qty_actual'],
                    'qty_diff' => 0,
                ]);
            }

            $adjustment->update([
                'number' => sprintf('ADJ-%s-%04d', now()->format('Ymd'), $adjustment->id),
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Penyesuaian stok berhasil dibuat sebagai draf.']);

        return to_route('adjustments.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(StockAdjustment $adjustment): Response
    {
        Gate::authorize('view', $adjustment);

        $adjustment->load([
            'store:id,name',
            'items.product:id,name,sku,cost_price',
            'items.variant:id,name,sku,cost_price',
            'creator:id,name',
            'approver:id,name',
        ]);

        $items = [];

        foreach ($adjustment->items as $item) {
            $systemNow = (int) (StockLevel::query()
                ->where('store_id', $adjustment->store_id)
                ->where('product_id', $item->product_id)
                ->where('variant_id', $item->variant_id)
                ->value('qty_on_hand') ?? 0);

            $items[] = array_merge($item->toArray(), ['qty_system_now' => $systemNow]);
        }

        return Inertia::render('adjustments/show', [
            'adjustment' => array_merge($adjustment->toArray(), ['items' => $items]),
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(StockAdjustment $adjustment): Response|RedirectResponse
    {
        Gate::authorize('update', $adjustment);

        if ($adjustment->status !== 'draft') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Hanya draf yang dapat diubah.']);

            return to_route('adjustments.show', $adjustment);
        }

        $adjustment->load('items');

        return Inertia::render('adjustments/edit', [
            'adjustment' => $adjustment,
            ...$this->formOptions(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateStockAdjustmentRequest $request, StockAdjustment $adjustment): RedirectResponse
    {
        if ($adjustment->status !== 'draft') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Hanya draf yang dapat diubah.']);

            return to_route('adjustments.show', $adjustment);
        }

        $validated = $request->validated();

        DB::transaction(function () use ($validated, $adjustment): void {
            $adjustment->items()->delete();

            foreach ($validated['items'] as $row) {
                $adjustment->items()->create([
                    'product_id' => $row['product_id'],
                    'variant_id' => $row['variant_id'] ?? null,
                    'qty_system' => 0,
                    'qty_actual' => $row['qty_actual'],
                    'qty_diff' => 0,
                ]);
            }

            $adjustment->update([
                'store_id' => $validated['store_id'],
                'type' => $validated['type'],
                'reason' => $validated['reason'] ?? null,
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Penyesuaian stok berhasil diperbarui.']);

        return to_route('adjustments.show', $adjustment);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(StockAdjustment $adjustment): RedirectResponse
    {
        Gate::authorize('delete', $adjustment);

        if ($adjustment->status !== 'draft') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Hanya draf yang dapat dihapus.']);

            return to_route('adjustments.show', $adjustment);
        }

        $adjustment->items()->delete();
        $adjustment->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Draf penyesuaian berhasil dihapus.']);

        return to_route('adjustments.index');
    }

    /**
     * Approve a draft and post the stock difference to the ledger.
     */
    public function approve(Request $request, StockAdjustment $adjustment): RedirectResponse
    {
        Gate::authorize('approve', $adjustment);

        if ($adjustment->status !== 'draft') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Hanya draf yang dapat disetujui.']);

            return to_route('adjustments.show', $adjustment);
        }

        DB::transaction(function () use ($request, $adjustment): void {
            foreach ($adjustment->items()->with(['product', 'variant'])->get() as $item) {
                $level = StockLevel::firstOrCreate([
                    'store_id' => $adjustment->store_id,
                    'product_id' => $item->product_id,
                    'variant_id' => $item->variant_id,
                ], ['qty_on_hand' => 0, 'qty_reserved' => 0]);

                $system = $level->qty_on_hand;
                $diff = round($item->qty_actual - $system, 3);

                $item->update(['qty_system' => $system, 'qty_diff' => $diff]);

                if ($diff == 0) {
                    continue;
                }

                $level->increment('qty_on_hand', $diff);

                $unitCost = $item->variant_id !== null
                    ? $item->variant->cost_price
                    : $item->product->cost_price;

                StockMovement::create([
                    'product_id' => $item->product_id,
                    'variant_id' => $item->variant_id,
                    'store_id' => $adjustment->store_id,
                    'type' => 'adjustment',
                    'reference_type' => 'stock_adjustment',
                    'reference_id' => $adjustment->id,
                    'qty_change' => $diff,
                    'qty_before' => $system,
                    'qty_after' => $system + $diff,
                    'unit_cost' => $unitCost,
                    'notes' => "Penyesuaian {$adjustment->number} ({$adjustment->type})",
                    'created_by' => $request->user()->id,
                ]);
            }

            $adjustment->update([
                'status' => 'approved',
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Penyesuaian disetujui dan stok diperbarui.']);

        return to_route('adjustments.show', $adjustment);
    }

    /**
     * Options shared by the create and edit forms.
     *
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        return [
            'stores' => Store::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'is_main']),
            'products' => Product::query()
                ->where('is_active', true)
                ->with(['variants' => fn ($q) => $q->where('is_active', true)])
                ->orderBy('name')
                ->get(['id', 'name', 'sku']),
        ];
    }
}
