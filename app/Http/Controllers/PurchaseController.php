<?php

namespace App\Http\Controllers;

use App\Http\Requests\Purchase\ReceivePurchaseRequest;
use App\Http\Requests\Purchase\RecordPaymentRequest;
use App\Http\Requests\Purchase\StorePurchaseRequest;
use App\Http\Requests\Purchase\UpdatePurchaseRequest;
use App\Models\Document;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Store;
use App\Models\Supplier;
use App\Services\PurchaseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Purchase::class);

        $search = $request->string('search')->toString();
        $status = $request->string('status')->toString();

        $purchases = Purchase::query()
            ->with(['supplier:id,name', 'store:id,name'])
            ->when($search, fn ($query) => $query
                ->where('number', 'like', "%{$search}%")
                ->orWhereHas('supplier', fn ($q) => $q->where('name', 'like', "%{$search}%"))
            )
            ->when($status, fn ($query) => $query->where('status', $status))
            ->orderByDesc('id')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('purchases/index', [
            'purchases' => $purchases,
            'filters' => ['search' => $search, 'status' => $status ?: null],
            ...$this->formOptions(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePurchaseRequest $request, PurchaseService $purchases): RedirectResponse
    {
        $validated = $request->validated();

        $documentId = isset($validated['document_id']) ? (int) $validated['document_id'] : null;
        $document = $documentId !== null ? Document::query()->findOrFail($documentId) : null;

        $purchases->createDraft($request->user(), $validated, $document);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pembelian berhasil dibuat sebagai draf.']);

        return to_route('purchases.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(Purchase $purchase): Response
    {
        Gate::authorize('view', $purchase);

        $purchase->load([
            'supplier:id,name,phone',
            'store:id,name',
            'items.product:id,name,sku',
            'items.variant:id,name,sku',
            'creator:id,name',
            'payments.creator:id,name',
        ]);

        return Inertia::render('purchases/show', [
            'purchase' => $purchase,
            ...$this->formOptions(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePurchaseRequest $request, Purchase $purchase, PurchaseService $purchases): RedirectResponse
    {
        if ($purchase->status !== 'draft') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Hanya draf yang dapat diubah.']);

            return to_route('purchases.show', $purchase);
        }

        $purchases->updateDraft($purchase, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pembelian berhasil diperbarui.']);

        return to_route('purchases.show', $purchase);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Purchase $purchase): RedirectResponse
    {
        Gate::authorize('delete', $purchase);

        if ($purchase->status !== 'draft' || $purchase->items()->where('qty_received', '>', 0)->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Hanya draf yang belum diterima yang dapat dihapus.']);

            return to_route('purchases.show', $purchase);
        }

        $purchase->items()->delete();
        $purchase->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Draf pembelian berhasil dihapus.']);

        return to_route('purchases.index');
    }

    /**
     * Mark a draft purchase as ordered.
     */
    public function order(Purchase $purchase): RedirectResponse
    {
        Gate::authorize('update', $purchase);

        if ($purchase->status !== 'draft') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Hanya draf yang dapat dipesan.']);

            return to_route('purchases.show', $purchase);
        }

        $purchase->update(['status' => 'ordered', 'ordered_at' => now()]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pembelian ditandai sebagai dipesan.']);

        return to_route('purchases.show', $purchase);
    }

    /**
     * Cancel a purchase that has no received goods.
     */
    public function cancel(Purchase $purchase): RedirectResponse
    {
        Gate::authorize('update', $purchase);

        if (! in_array($purchase->status, ['draft', 'ordered'], true)
            || $purchase->items()->where('qty_received', '>', 0)->exists()
        ) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Pembelian yang sudah ada penerimaannya tidak dapat dibatalkan.']);

            return to_route('purchases.show', $purchase);
        }

        $purchase->update(['status' => 'cancelled']);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pembelian berhasil dibatalkan.']);

        return to_route('purchases.show', $purchase);
    }

    /**
     * Receive goods and post stock ledger movements.
     */
    public function receive(ReceivePurchaseRequest $request, Purchase $purchase, PurchaseService $purchases): RedirectResponse
    {
        $purchases->receive($request->user(), $purchase, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Barang berhasil diterima dan stok diperbarui.']);

        return to_route('purchases.show', $purchase);
    }

    /**
     * Record a payment toward the purchase.
     */
    public function pay(RecordPaymentRequest $request, Purchase $purchase, PurchaseService $purchases): RedirectResponse
    {
        $purchases->recordPayment($purchase, (int) $request->validated()['amount'], $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pembayaran berhasil dicatat.']);

        return to_route('purchases.show', $purchase);
    }

    /**
     * Options shared by the create and edit forms.
     *
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        return [
            'suppliers' => Supplier::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'stores' => Store::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'is_main']),
            'products' => Product::query()
                ->where('is_active', true)
                ->with(['variants' => fn ($q) => $q->where('is_active', true)])
                ->orderBy('name')
                ->get(['id', 'name', 'sku', 'cost_price']),
        ];
    }
}
