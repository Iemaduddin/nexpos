<?php

namespace App\Services;

use App\Concerns\Auditable;
use App\Models\BusinessSetting;
use App\Models\CashSession;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\User;
use App\Support\Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * POS checkout orchestration extracted from SaleController.
 *
 * Controller stays thin: validation + response. All money math uses
 * App\Support\Money; all writes run in one DB transaction.
 */
class CheckoutService
{
    use Auditable;

    /**
     * @param  array<string, mixed>  $validated
     */
    public function checkout(User $user, array $validated, ?string $idempotencyKey = null): Sale
    {
        $store = $user->store ?? Store::query()->where('is_main', true)->first()
            ?? Store::query()->orderBy('id')->firstOrFail();

        $settings = BusinessSetting::first();
        $taxRate = $settings === null ? 0.0 : (float) $settings->default_tax_rate;
        $roundingUnit = $settings === null ? 1 : (int) $settings->rounding_unit;
        $maxDiscountPercent = $settings === null ? 100.0 : (float) $settings->max_discount_percent;

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

        // Idempotency: same key returns the original sale instead of double-charging.
        if ($idempotencyKey) {
            $existing = Sale::query()
                ->where('cash_session_id', $session->id)
                ->where('notes', 'like', '%[idem:'.$idempotencyKey.']%')
                ->latest('id')
                ->first();

            if ($existing) {
                return $existing;
            }
        }

        $sale = DB::transaction(function () use ($validated, $user, $store, $session, $taxRate, $roundingUnit, $maxDiscountPercent, $idempotencyKey) {
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
                $variantId = isset($row['variant_id']) && $row['variant_id'] !== ''
                    ? (int) $row['variant_id']
                    : null;
                $qty = (float) ($row['qty'] ?? 0);

                $unitPrice = $variantId !== null
                    ? $product->variants()->where('id', $variantId)->firstOrFail()->selling_price
                    : $product->selling_price;

                $lineGross = Money::lineGross($qty, (int) $unitPrice);
                $lineDiscount = Money::capDiscount((int) ($row['discount'] ?? 0), $lineGross);
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
                            "items.{$i}.qty" => "Stok {$product->name} tidak cukup (tersedia ".Money::formatQty($available).').',
                        ]);
                    }
                }

                $lines[] = [
                    'product' => $product,
                    'variant_id' => $variantId,
                    'qty' => $qty,
                    'unit_price' => (int) $unitPrice,
                    'cost_price' => $variantId !== null
                        ? (int) $product->variants()->where('id', $variantId)->firstOrFail()->cost_price
                        : (int) $product->cost_price,
                    'discount' => $lineDiscount,
                    'subtotal' => $lineSubtotal,
                ];
            }

            $cartDiscount = Money::capDiscount((int) ($validated['discount_total'] ?? 0), $subtotal);
            $totalDiscount = $cartDiscount + (int) collect($lines)->sum('discount');

            if ($totalDiscount > Money::maxDiscount($grossSubtotal, $maxDiscountPercent)) {
                throw ValidationException::withMessages([
                    'discount_total' => "Total diskon tidak boleh melebihi {$maxDiscountPercent}% dari subtotal.",
                ]);
            }

            if ($totalDiscount > 0 && ! $user->can('sales.discount')) {
                throw ValidationException::withMessages([
                    'discount_total' => 'Diskon hanya dapat diberikan oleh manager.',
                ]);
            }

            $taxable = $subtotal - $cartDiscount;
            $tax = Money::tax($taxable, $taxRate);
            $grand = Money::roundTotal($taxable + $tax, $roundingUnit);

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

            $notes = $validated['notes'] ?? null;

            if ($idempotencyKey) {
                $notes = trim(($notes ? $notes.' ' : '').'[idem:'.$idempotencyKey.']');
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
                'notes' => $notes,
            ]);

            $sale->update(['number' => sprintf('TRX-%s-%04d', now()->format('Ymd'), $sale->id)]);

            foreach ((array) ($validated['payments'] ?? []) as $payment) {
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

            foreach ($lines as $line) {
                /** @var Product $product */
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

                $before = (float) $level->qty_on_hand;
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

            self::audit('sale.checkout', $sale, [], [
                'number' => $sale->number,
                'grand_total' => $grand,
                'store_id' => $store->id,
            ]);

            return $sale;
        });

        return $sale;
    }
}
