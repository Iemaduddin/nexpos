<?php

namespace App\Services;

use App\Concerns\Auditable;
use App\Models\StockAdjustment;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Stock adjustment lifecycle extracted from StockAdjustmentController.
 *
 * Approve posts the counted difference to the ledger under row locks
 * so concurrent approvals cannot double-apply the same diff.
 */
class StockAdjustmentService
{
    use Auditable;

    /**
     * @param  array<string, mixed>  $validated
     */
    public function createDraft(User $user, array $validated): StockAdjustment
    {
        return DB::transaction(function () use ($user, $validated) {
            $adjustment = StockAdjustment::create([
                'number' => 'TMP-'.Str::uuid(),
                'store_id' => $validated['store_id'],
                'type' => $validated['type'],
                'status' => 'draft',
                'reason' => $validated['reason'] ?? null,
                'created_by' => $user->id,
            ]);

            $this->syncItems($adjustment, (array) ($validated['items'] ?? []));

            $adjustment->update([
                'number' => sprintf('ADJ-%s-%04d', now()->format('Ymd'), $adjustment->id),
            ]);

            self::audit('adjustment.create', $adjustment, [], ['number' => $adjustment->number]);

            return $adjustment;
        });
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public function updateDraft(StockAdjustment $adjustment, array $validated): StockAdjustment
    {
        return DB::transaction(function () use ($adjustment, $validated) {
            $this->syncItems($adjustment, (array) ($validated['items'] ?? []), true);

            $adjustment->update([
                'store_id' => $validated['store_id'],
                'type' => $validated['type'],
                'reason' => $validated['reason'] ?? null,
            ]);

            self::audit('adjustment.update', $adjustment, [], ['number' => $adjustment->number]);

            return $adjustment;
        });
    }

    public function approve(User $user, StockAdjustment $adjustment): StockAdjustment
    {
        return DB::transaction(function () use ($user, $adjustment) {
            foreach ($adjustment->items()->with(['product', 'variant'])->lockForUpdate()->get() as $item) {
                $level = StockLevel::query()->lockForUpdate()->firstOrCreate([
                    'store_id' => $adjustment->store_id,
                    'product_id' => $item->product_id,
                    'variant_id' => $item->variant_id,
                ], ['qty_on_hand' => 0, 'qty_reserved' => 0]);

                $system = (float) $level->qty_on_hand;
                $diff = round((float) $item->qty_actual - $system, 3);

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
                    'created_by' => $user->id,
                ]);
            }

            $adjustment->update([
                'status' => 'approved',
                'approved_by' => $user->id,
                'approved_at' => now(),
            ]);

            self::audit('adjustment.approve', $adjustment, [], ['number' => $adjustment->number]);

            return $adjustment;
        });
    }

    /**
     * @param  array<mixed, mixed>  $rows
     */
    private function syncItems(StockAdjustment $adjustment, array $rows, bool $reset = false): void
    {
        if ($reset) {
            $adjustment->items()->delete();
        }

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $adjustment->items()->create([
                'product_id' => $row['product_id'],
                'variant_id' => $row['variant_id'] ?? null,
                'qty_system' => 0,
                'qty_actual' => $row['qty_actual'],
                'qty_diff' => 0,
            ]);
        }
    }
}
