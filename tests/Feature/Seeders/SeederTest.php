<?php

use App\Models\Customer;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Database\Seeders\BaseDataSeeder;
use Database\Seeders\HistorySeeder;
use Database\Seeders\MasterDataSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;

test('master data seeds idempotently', function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->seed(BaseDataSeeder::class);
    $this->seed(AdminUserSeeder::class);

    $this->seed(MasterDataSeeder::class);
    $this->seed(MasterDataSeeder::class);

    expect(Product::count())->toBe(16);
    expect(Product::has('variants')->count())->toBe(3);
    expect(Customer::count())->toBe(12);
    expect(Supplier::count())->toBe(3);
    expect(User::where('email', 'kasir@example.com')->exists())->toBeTrue();
    expect(User::where('email', 'manager@example.com')->exists())->toBeTrue();
});

test('history seeds ledger-consistent sales', function () {
    config(['seeding.history_days' => 3, 'seeding.sales_per_day' => '2-3']);

    $this->seed(RolesAndPermissionsSeeder::class);
    $this->seed(BaseDataSeeder::class);
    $this->seed(AdminUserSeeder::class);
    $this->seed(MasterDataSeeder::class);

    $this->seed(HistorySeeder::class);

    expect(Sale::count())->toBeGreaterThanOrEqual(6);
    expect(Purchase::count())->toBeGreaterThanOrEqual(0);

    // Ledger balances match levels.
    $levelsOk = StockLevel::all()->every(function ($level) {
        $balance = StockMovement::where('store_id', $level->store_id)
            ->where('product_id', $level->product_id)
            ->where('variant_id', $level->variant_id)
            ->sum('qty_change');

        return (int) $balance === (int) $level->qty_on_hand;
    });

    expect($levelsOk)->toBeTrue();
    expect(StockLevel::where('qty_on_hand', '<', 0)->count())->toBe(0);
});
