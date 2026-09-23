<?php

namespace App\Http\Controllers;

use App\Http\Requests\Purchase\ReceivePurchaseRequest;
use App\Http\Requests\Purchase\RecordPaymentRequest;
use App\Http\Requests\Purchase\StorePurchaseRequest;
use App\Http\Requests\Purchase\UpdatePurchaseRequest;
use App\Models\Document;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
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
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        Gate::authorize('create', Purchase::class);

        return Inertia::render('purchases/create', $this->formOptions());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePurchaseRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $documentId = isset($validated['document_id']) ? (int) $validated['document_id'] : null;
        $document = $documentId !== null ? Document::query()->findOrFail($documentId) : null;

        if ($document !== null && $document->status === 'verified') {
            throw ValidationException::withMessages([
                'document_id' => 'Dokumen sudah menjadi pembelian.',
            ]);
        }

        DB::transaction(function () use ($validated, $request, $document): void {
            $purchase = Purchase::create([
                'number' => 'TMP-'.Str::uuid(),
                'supplier_id' => $validated['supplier_id'],
                'store_id' => $validated['store_id'],
                'status' => 'draft',
                'discount' => $validated['discount'] ?? 0,
                'tax' => $validated['tax'] ?? 0,
                'expected_at' => $validated['expected_at'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            $subtotal = 0;
            foreach ($validated['items'] as $row) {
                $line = (int) round((float) ($row['qty_ordered'] ?? 0) * (int) ($row['cost_price'] ?? 0));
                $subtotal += $line;

                $purchase->items()->create([
                    'product_id' => $row['product_id'],
                    'variant_id' => $row['variant_id'] ?? null,
                    'qty_ordered' => $row['qty_ordered'],
                    'cost_price' => $row['cost_price'],
                    'subtotal' => $line,
                ]);
            }

            $purchase->update([
                'number' => sprintf('PO-%s-%04d', now()->format('Ymd'), $purchase->id),
                'subtotal' => $subtotal,
                'grand_total' => $subtotal - $purchase->discount + $purchase->tax,
            ]);

            if ($document !== null) {
                $document->update([
                    'status' => 'verified',
                    'purchase_id' => $purchase->id,
                    'supplier_id' => $purchase->supplier_id,
                ]);
            }
        });

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
        ]);

        return Inertia::render('purchases/show', [
            'purchase' => $purchase,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Purchase $purchase): Response|RedirectResponse
    {
        Gate::authorize('update', $purchase);

        if ($purchase->status !== 'draft') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Hanya draf yang dapat diubah.']);

            return to_route('purchases.show', $purchase);
        }

        $purchase->load('items');

        return Inertia::render('purchases/edit', [
            'purchase' => $purchase,
            ...$this->formOptions(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePurchaseRequest $request, Purchase $purchase): RedirectResponse
    {
        if ($purchase->status !== 'draft') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Hanya draf yang dapat diubah.']);

            return to_route('purchases.show', $purchase);
        }

        $validated = $request->validated();

        DB::transaction(function () use ($validated, $purchase): void {
            $purchase->items()->delete();

            $subtotal = 0;
            foreach ($validated['items'] as $row) {
                $line = (int) round((float) ($row['qty_ordered'] ?? 0) * (int) ($row['cost_price'] ?? 0));
                $subtotal += $line;

                $purchase->items()->create([
                    'product_id' => $row['product_id'],
                    'variant_id' => $row['variant_id'] ?? null,
                    'qty_ordered' => $row['qty_ordered'],
                    'cost_price' => $row['cost_price'],
                    'subtotal' => $line,
                ]);
            }

            $purchase->update([
                'supplier_id' => $validated['supplier_id'],
                'store_id' => $validated['store_id'],
                'discount' => $validated['discount'] ?? 0,
                'tax' => $validated['tax'] ?? 0,
                'subtotal' => $subtotal,
                'grand_total' => $subtotal - ($validated['discount'] ?? 0) + ($validated['tax'] ?? 0),
                'expected_at' => $validated['expected_at'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);
        });

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
    public function receive(ReceivePurchaseRequest $request, Purchase $purchase): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $request, $purchase): void {
            $rows = $validated['items'] ?? [];

            if (! is_array($rows)) {
                return;
            }

            foreach ($rows as $row) {
                if (! is_array($row)) {
                    continue;
                }

                $qty = (float) ($row['qty'] ?? 0);

                if ($qty <= 0) {
                    continue;
                }

                $item = $purchase->items()->findOrFail((int) ($row['id'] ?? 0));
                $item->increment('qty_received', $qty);

                $level = StockLevel::firstOrCreate([
                    'store_id' => $purchase->store_id,
                    'product_id' => $item->product_id,
                    'variant_id' => $item->variant_id,
                ], ['qty_on_hand' => 0, 'qty_reserved' => 0]);

                $before = $level->qty_on_hand;
                $level->increment('qty_on_hand', $qty);

                StockMovement::create([
                    'product_id' => $item->product_id,
                    'variant_id' => $item->variant_id,
                    'store_id' => $purchase->store_id,
                    'type' => 'purchase',
                    'reference_type' => 'purchase',
                    'reference_id' => $purchase->id,
                    'qty_change' => $qty,
                    'qty_before' => $before,
                    'qty_after' => $before + $qty,
                    'unit_cost' => $item->cost_price,
                    'notes' => "Penerimaan {$purchase->number}",
                    'created_by' => $request->user()->id,
                ]);

                if ($item->variant_id) {
                    $item->variant()->update(['cost_price' => $item->cost_price]);
                } else {
                    $item->product()->update(['cost_price' => $item->cost_price]);
                }
            }

            $fullyReceived = ! $purchase->items()->whereRaw('qty_received < qty_ordered')->exists();

            $purchase->update([
                'status' => $fullyReceived ? 'received' : 'partial',
                'received_at' => $purchase->received_at ?? now(),
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Barang berhasil diterima dan stok diperbarui.']);

        return to_route('purchases.show', $purchase);
    }

    /**
     * Record a payment toward the purchase.
     */
    public function pay(RecordPaymentRequest $request, Purchase $purchase): RedirectResponse
    {
        $purchase->increment('paid_amount', $request->validated()['amount']);
        $purchase->refresh();

        $purchase->update(['payment_status' => $this->paymentStatusFor($purchase)]);

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

    private function paymentStatusFor(Purchase $purchase): string
    {
        if ($purchase->paid_amount <= 0) {
            return 'unpaid';
        }

        return $purchase->paid_amount >= $purchase->grand_total ? 'paid' : 'partial';
    }
}
