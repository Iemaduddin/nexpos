<?php

namespace App\Services;

use App\Concerns\Auditable;
use App\Models\Document;
use App\Models\Purchase;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\User;
use App\Support\Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Purchase lifecycle extracted from PurchaseController.
 *
 * Controller stays thin: validation + response. Totals use Money so
 * draft math matches receive/payment math everywhere.
 */
class PurchaseService
{
    use Auditable;

    /**
     * @param  array<string, mixed>  $validated
     */
    public function createDraft(User $user, array $validated, ?Document $document = null): Purchase
    {
        if ($document !== null && $document->status === 'verified') {
            throw ValidationException::withMessages([
                'document_id' => 'Dokumen sudah menjadi pembelian.',
            ]);
        }

        if ($document !== null && $document->status === 'rejected') {
            throw ValidationException::withMessages([
                'document_id' => 'Dokumen yang ditolak tidak dapat menjadi pembelian.',
            ]);
        }

        return DB::transaction(function () use ($user, $validated, $document) {
            $purchase = Purchase::create([
                'number' => 'TMP-'.Str::uuid(),
                'supplier_id' => $validated['supplier_id'],
                'store_id' => $validated['store_id'],
                'status' => 'draft',
                'discount' => $validated['discount'] ?? 0,
                'tax' => $validated['tax'] ?? 0,
                'expected_at' => $validated['expected_at'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $user->id,
            ]);

            $subtotal = $this->syncItems($purchase, (array) ($validated['items'] ?? []));

            $purchase->update([
                'number' => sprintf('PO-%s-%04d', now()->format('Ymd'), $purchase->id),
                'subtotal' => $subtotal,
                'grand_total' => $subtotal - (int) $purchase->discount + (int) $purchase->tax,
            ]);

            if ($document !== null) {
                $document->update([
                    'status' => 'verified',
                    'purchase_id' => $purchase->id,
                    'supplier_id' => $purchase->supplier_id,
                ]);
            }

            self::audit('purchase.create', $purchase, [], [
                'number' => $purchase->number,
                'grand_total' => $purchase->grand_total,
            ]);

            return $purchase;
        });
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function updateDraft(Purchase $purchase, array $validated): Purchase
    {
        return DB::transaction(function () use ($purchase, $validated) {
            $subtotal = $this->syncItems($purchase, (array) ($validated['items'] ?? []), true);

            $purchase->update([
                'supplier_id' => $validated['supplier_id'],
                'store_id' => $validated['store_id'],
                'discount' => $validated['discount'] ?? 0,
                'tax' => $validated['tax'] ?? 0,
                'subtotal' => $subtotal,
                'grand_total' => $subtotal - (int) ($validated['discount'] ?? 0) + (int) ($validated['tax'] ?? 0),
                'expected_at' => $validated['expected_at'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            self::audit('purchase.update', $purchase, [], ['number' => $purchase->number]);

            return $purchase;
        });
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function receive(User $user, Purchase $purchase, array $validated): Purchase
    {
        return DB::transaction(function () use ($user, $purchase, $validated) {
            $rows = $validated['items'] ?? [];

            if (is_array($rows)) {
                foreach ($rows as $row) {
                    if (! is_array($row)) {
                        continue;
                    }

                    $qty = (float) ($row['qty'] ?? 0);

                    if ($qty <= 0) {
                        continue;
                    }

                    $item = $purchase->items()->lockForUpdate()->findOrFail((int) ($row['id'] ?? 0));
                    $item->increment('qty_received', $qty);

                    $level = StockLevel::query()->lockForUpdate()->firstOrCreate([
                        'store_id' => $purchase->store_id,
                        'product_id' => $item->product_id,
                        'variant_id' => $item->variant_id,
                    ], ['qty_on_hand' => 0, 'qty_reserved' => 0]);

                    $before = (float) $level->qty_on_hand;
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
                        'created_by' => $user->id,
                    ]);

                    if ($item->variant_id) {
                        $item->variant()->update(['cost_price' => $item->cost_price]);
                    } else {
                        $item->product()->update(['cost_price' => $item->cost_price]);
                    }
                }
            }

            $fullyReceived = ! $purchase->items()->whereRaw('qty_received < qty_ordered')->exists();

            $purchase->update([
                'status' => $fullyReceived ? 'received' : 'partial',
                'received_at' => $purchase->received_at ?? now(),
            ]);

            self::audit('purchase.receive', $purchase, [], ['status' => $purchase->status]);

            return $purchase;
        });
    }

    public function recordPayment(Purchase $purchase, int $amount, ?User $user = null, ?string $notes = null): Purchase
    {
        return DB::transaction(function () use ($purchase, $amount, $user, $notes) {
            $purchase->payments()->create([
                'amount' => $amount,
                'paid_at' => now(),
                'notes' => $notes,
                'created_by' => $user?->id,
            ]);

            $purchase->increment('paid_amount', $amount);
            $purchase->refresh();
            $purchase->update(['payment_status' => $this->paymentStatusFor($purchase)]);

            self::audit('purchase.payment', $purchase, [], ['amount' => $amount]);

            return $purchase;
        });
    }

    /**
     * @param  array<mixed, mixed>  $rows
     */
    private function syncItems(Purchase $purchase, array $rows, bool $reset = false): int
    {
        if ($reset) {
            $purchase->items()->delete();
        }

        $subtotal = 0;

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $line = Money::lineGross((float) ($row['qty_ordered'] ?? 0), (int) ($row['cost_price'] ?? 0));
            $subtotal += $line;

            $purchase->items()->create([
                'product_id' => $row['product_id'],
                'variant_id' => $row['variant_id'] ?? null,
                'qty_ordered' => $row['qty_ordered'],
                'cost_price' => $row['cost_price'],
                'subtotal' => $line,
            ]);
        }

        return $subtotal;
    }

    private function paymentStatusFor(Purchase $purchase): string
    {
        if ($purchase->paid_amount <= 0) {
            return 'unpaid';
        }

        return $purchase->paid_amount >= $purchase->grand_total ? 'paid' : 'partial';
    }
}
