<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Demo history: opening stock, weekly purchases, and daily sales.
 *
 * Runs oldest-first through the stock ledger so balances stay consistent.
 * Skips entirely when sales already exist (use migrate:fresh to reseed).
 * Volume via env: SEED_HISTORY_DAYS (default 90), SEED_SALES_PER_DAY (default "8-12").
 */
class HistorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (Sale::exists()) {
            $this->command->info('Riwayat penjualan sudah ada, lewati.');

            return;
        }

        mt_srand(42);

        $days = max(1, (int) config('seeding.history_days', 90));
        [$minSales, $maxSales] = $this->parseRange((string) config('seeding.sales_per_day', '8-12'));

        $store = Store::where('code', 'TOKO-UTAMA')->first() ?? Store::orderBy('id')->firstOrFail();
        $cashier = User::where('email', 'kasir@example.com')->first()
            ?? User::where('email', 'admin@example.com')->firstOrFail();
        $adminId = User::where('email', 'admin@example.com')->value('id') ?? $cashier->id;

        $products = Product::with(['variants', 'unit:id,symbol'])->where('is_active', true)->get();

        if ($products->isEmpty()) {
            $this->command->error('Tidak ada produk. Jalankan MasterDataSeeder dulu.');

            return;
        }

        $customers = Customer::where('is_active', true)->get();
        $suppliers = Supplier::where('is_active', true)->get();

        $this->openingStock($store->id, $products, $adminId);

        $today = CarbonImmutable::now()->startOfDay();

        for ($offset = $days - 1; $offset >= 0; $offset--) {
            $date = $today->subDays($offset);
            $this->seedPurchases($date, $store->id, $products, $suppliers, $adminId);
            $this->seedSales($date, $store->id, $products, $customers, $cashier->id, mt_rand($minSales, $maxSales));

            if ($offset % 15 === 0) {
                $this->command->info("Hari ke-{$days}−{$offset} selesai.");
            }
        }
    }

    /**
     * @param  Collection<int, Product>  $products
     */
    private function openingStock(int $storeId, $products, int $userId): void
    {
        foreach ($products as $product) {
            $this->addStock($storeId, $product->id, null, 500, 'opening', null, $userId);

            foreach ($product->variants as $variant) {
                $this->addStock($storeId, $product->id, $variant->id, 200, 'opening', null, $userId);
            }
        }
    }

    /**
     * @param  Collection<int, Product>  $products
     * @param  Collection<int, Supplier>  $suppliers
     */
    private function seedPurchases(CarbonImmutable $date, int $storeId, $products, $suppliers, int $userId): void
    {
        if ($date->dayOfWeek !== CarbonImmutable::MONDAY || $suppliers->isEmpty()) {
            return;
        }

        $supplier = $suppliers->values()->get($date->weekOfYear % max(1, $suppliers->count())) ?? $suppliers->firstOrFail();
        $take = min($products->count(), mt_rand(3, 5));
        $picked = $take <= 1 ? [$products->random()] : $products->random($take)->all();

        DB::transaction(function () use ($date, $storeId, $supplier, $picked, $userId): void {
            $purchase = Purchase::create([
                'number' => 'TMP-seed',
                'supplier_id' => $supplier->id,
                'store_id' => $storeId,
                'status' => 'received',
                'ordered_at' => $date->setTime(8, 0),
                'received_at' => $date->setTime(10, 0),
                'created_by' => $userId,
                'created_at' => $date->setTime(8, 0),
                'updated_at' => $date->setTime(10, 0),
            ]);

            $subtotal = 0;

            foreach ($picked as $product) {
                $qty = mt_rand(20, 50);
                $line = $qty * $product->cost_price;
                $subtotal += $line;

                $purchase->items()->create([
                    'product_id' => $product->id,
                    'qty_ordered' => $qty,
                    'qty_received' => $qty,
                    'cost_price' => $product->cost_price,
                    'subtotal' => $line,
                ]);

                $this->addStock($storeId, $product->id, null, $qty, 'purchase', $purchase->id, $userId);
            }

            $purchase->update([
                'number' => sprintf('PO-%s-%04d', $date->format('Ymd'), $purchase->id % 10000),
                'subtotal' => $subtotal,
                'grand_total' => $subtotal,
                'paid_amount' => mt_rand(0, 1) === 1 ? $subtotal : (int) ($subtotal / 2),
                'payment_status' => 'partial',
            ]);
            $purchase->update([
                'payment_status' => $purchase->paid_amount >= $purchase->grand_total ? 'paid' : 'partial',
            ]);
        });
    }

    /**
     * @param  Collection<int, Product>  $products
     * @param  Collection<int, Customer>  $customers
     */
    private function seedSales(CarbonImmutable $date, int $storeId, $products, $customers, int $cashierId, int $count): void
    {
        $seq = 0;

        for ($n = 0; $n < $count; $n++) {
            $seq++;
            $at = $date->setTime(mt_rand(8, 20), mt_rand(0, 59));

            DB::transaction(function () use ($date, $seq, $at, $storeId, $products, $customers, $cashierId): void {
                $takeItems = mt_rand(1, min(4, $products->count()));
                $picked = $takeItems <= 1 ? [$products->random()] : $products->random($takeItems)->all();

                $customer = ! $customers->isEmpty() && mt_rand(1, 100) <= 60
                    ? $customers->random()
                    : null;

                $subtotal = 0;
                $lines = [];

                foreach ($picked as $product) {
                    $variant = null;

                    if ($product->variants->isNotEmpty() && mt_rand(1, 100) <= 30) {
                        $variant = $product->variants->random();
                    }

                    $price = $variant !== null ? $variant->selling_price : $product->selling_price;

                    // Occasional negotiated price, like real cashiers do.
                    if (mt_rand(1, 100) <= 5) {
                        $price = max(0, $price - 1000);
                    }

                    // Weighed units (kg/l/...) sometimes sell fractional.
                    $qty = mt_rand(1, 3);

                    if (! in_array(strtolower($product->unit->symbol ?? 'pcs'), ['pcs', 'pack', 'box'], true) && mt_rand(1, 100) <= 30) {
                        $qty = mt_rand(1, 5) / 2;
                    }

                    $line = (int) round($qty * $price);
                    $subtotal += $line;

                    $lines[] = [
                        'product' => $product,
                        'variant_id' => $variant?->id,
                        'qty' => $qty,
                        'unit_price' => $price,
                        'cost_price' => $variant !== null ? $variant->cost_price : $product->cost_price,
                        'subtotal' => $line,
                    ];
                }

                $discount = mt_rand(1, 100) <= 10 ? mt_rand(2, 5) * 1000 : 0;
                $grand = max(0, $subtotal - $discount);
                $method = mt_rand(1, 100) <= 85 ? 'cash' : 'qris';

                $sale = Sale::create([
                    'number' => sprintf('TRX-%s-%04d', $date->format('Ymd'), $seq),
                    'store_id' => $storeId,
                    'customer_id' => $customer?->id,
                    'cashier_id' => $cashierId,
                    'status' => 'completed',
                    'subtotal' => $subtotal,
                    'discount_total' => $discount,
                    'tax_total' => 0,
                    'grand_total' => $grand,
                    'paid_total' => $grand,
                    'change_amount' => 0,
                    'completed_at' => $at,
                    'created_at' => $at,
                    'updated_at' => $at,
                ]);

                foreach ($lines as $line) {
                    $sale->items()->create([
                        'product_id' => $line['product']->id,
                        'variant_id' => $line['variant_id'],
                        'qty' => $line['qty'],
                        'unit_price' => $line['unit_price'],
                        'cost_price' => $line['cost_price'],
                        'discount' => 0,
                        'subtotal' => $line['subtotal'],
                    ]);

                    $this->addStock($storeId, $line['product']->id, $line['variant_id'], -$line['qty'], 'sale', $sale->id, $cashierId);
                }

                $sale->payments()->create([
                    'sale_id' => $sale->id,
                    'method' => $method,
                    'amount' => $grand,
                    'paid_at' => $at,
                    'created_by' => $cashierId,
                    'created_at' => $at,
                    'updated_at' => $at,
                ]);

                if ($customer) {
                    $customer->increment('transaction_count');
                    $customer->increment('total_spent', $grand);
                }
            });
        }
    }

    private function addStock(int $storeId, int $productId, ?int $variantId, float $qty, string $type, ?int $referenceId, int $userId): void
    {
        $level = StockLevel::firstOrCreate(
            ['store_id' => $storeId, 'product_id' => $productId, 'variant_id' => $variantId],
            ['qty_on_hand' => 0, 'qty_reserved' => 0]
        );

        $before = $level->qty_on_hand;
        $level->increment('qty_on_hand', $qty);

        StockMovement::create([
            'product_id' => $productId,
            'variant_id' => $variantId,
            'store_id' => $storeId,
            'type' => $type,
            'reference_type' => $type === 'sale' ? 'sale' : ($type === 'purchase' ? 'purchase' : null),
            'reference_id' => $referenceId,
            'qty_change' => $qty,
            'qty_before' => $before,
            'qty_after' => $before + $qty,
            'created_by' => $userId,
        ]);
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function parseRange(string $value): array
    {
        $parts = array_map('intval', explode('-', $value) + [0, 0]);

        return [max(0, $parts[0]), max($parts[0], $parts[1])];
    }
}
