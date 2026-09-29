<?php

namespace App\Http\Controllers;

use App\Http\Requests\StockAdjustment\StoreStockAdjustmentRequest;
use App\Http\Requests\StockAdjustment\UpdateStockAdjustmentRequest;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\StockLevel;
use App\Models\Store;
use App\Services\StockAdjustmentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
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
            ...$this->formOptions(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreStockAdjustmentRequest $request, StockAdjustmentService $adjustments): RedirectResponse
    {
        $adjustments->createDraft($request->user(), $request->validated());

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
            ...$this->formOptions(),
            'adjustment' => array_merge($adjustment->toArray(), ['items' => $items]),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateStockAdjustmentRequest $request, StockAdjustment $adjustment, StockAdjustmentService $adjustments): RedirectResponse
    {
        if ($adjustment->status !== 'draft') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Hanya draf yang dapat diubah.']);

            return to_route('adjustments.show', $adjustment);
        }

        $adjustments->updateDraft($adjustment, $request->validated());

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
    public function approve(Request $request, StockAdjustment $adjustment, StockAdjustmentService $adjustments): RedirectResponse
    {
        Gate::authorize('approve', $adjustment);

        if ($adjustment->status !== 'draft') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Hanya draf yang dapat disetujui.']);

            return to_route('adjustments.show', $adjustment);
        }

        $adjustments->approve($request->user(), $adjustment);

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
