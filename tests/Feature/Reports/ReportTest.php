<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\StockLevel;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use App\Services\ReportService;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    Permission::create(['name' => 'reports.view']);
});

function reportUser(array $permissions = []): User
{
    $user = User::factory()->create();

    if ($permissions !== []) {
        $user->givePermissionTo($permissions);
    }

    return $user;
}

function reportMasterData(): array
{
    $suffix = str()->random(6);

    $store = Store::create(['code' => 'T-'.$suffix, 'name' => 'Toko '.$suffix, 'is_main' => true]);
    $user = User::factory()->create(['store_id' => $store->id]);
    $product = Product::create([
        'sku' => 'SKU-'.$suffix,
        'name' => 'Kopi '.$suffix,
        'slug' => 'kopi-'.$suffix,
        'category_id' => Category::create(['name' => 'Minuman '.$suffix, 'slug' => 'minuman-'.$suffix])->id,
        'unit_id' => Unit::create(['name' => 'Pcs '.$suffix, 'symbol' => 'pcs-'.$suffix])->id,
        'cost_price' => 20000,
        'selling_price' => 30000,
        'low_stock_threshold' => 5,
    ]);

    return ['store' => $store, 'user' => $user, 'product' => $product];
}

function reportSale(array $master, array $overrides = []): Sale
{
    $sale = Sale::create(array_merge([
        'number' => 'TRX-'.str()->random(8),
        'store_id' => $master['store']->id,
        'cashier_id' => $master['user']->id,
        'status' => 'completed',
        'subtotal' => 59000,
        'discount_total' => 5000,
        'tax_total' => 0,
        'grand_total' => 54000,
        'paid_total' => 54000,
        'change_amount' => 0,
        'completed_at' => now(),
    ], $overrides));

    $sale->items()->create([
        'product_id' => $master['product']->id,
        'qty' => 2,
        'unit_price' => 30000,
        'cost_price' => 20000,
        'discount' => 1000,
        'subtotal' => 59000,
    ]);

    return $sale;
}

test('dashboard renders with real aggregates', function () {
    $this->actingAs(reportUser());
    $master = reportMasterData();
    reportSale($master);

    $this->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('overview.revenue', 54000)
            ->where('overview.transactions', 1)
            ->where('overview.profit', 14000)
            ->has('topProducts', 1)
            ->has('recentSales', 1));
});

test('overview math is correct with refunds', function () {
    $master = reportMasterData();
    $sale = reportSale($master);

    SaleReturn::create([
        'number' => 'RTN-1',
        'sale_id' => $sale->id,
        'store_id' => $master['store']->id,
        'total_refund' => 4000,
        'created_by' => $master['user']->id,
    ]);

    $service = app(ReportService::class);
    $range = $service->resolveRange('today');
    $overview = $service->overview($range['start'], $range['end']);

    expect($overview['revenue'])->toBe(54000);
    expect($overview['refunds'])->toBe(4000);
    expect($overview['net_revenue'])->toBe(50000);
    expect($overview['avg_transaction'])->toBe(54000);
    expect($overview['items_sold'])->toBe(2);
    expect($overview['profit'])->toBe(10000);
});

test('top products are ordered by quantity', function () {
    $master = reportMasterData();
    $second = Product::create([
        'sku' => 'SKU2-'.str()->random(6),
        'name' => 'Teh',
        'slug' => 'teh-'.str()->random(6),
        'category_id' => Category::firstOrFail()->id,
        'unit_id' => Unit::firstOrFail()->id,
        'cost_price' => 5000,
        'selling_price' => 10000,
    ]);

    $sale = reportSale($master);
    $sale->items()->create([
        'product_id' => $second->id,
        'qty' => 5,
        'unit_price' => 10000,
        'cost_price' => 5000,
        'discount' => 0,
        'subtotal' => 50000,
    ]);

    $service = app(ReportService::class);
    $range = $service->resolveRange('today');
    $top = $service->topProducts($range['start'], $range['end'], 5);

    expect($top[0]['id'])->toBe($second->id);
    expect($top[0]['qty'])->toBe(5);
    expect($top[1]['qty'])->toBe(2);
});

test('low stock flags products at or below threshold', function () {
    $master = reportMasterData();
    StockLevel::create([
        'store_id' => $master['store']->id,
        'product_id' => $master['product']->id,
        'qty_on_hand' => 5,
    ]);

    $low = app(ReportService::class)->lowStock(5);

    expect($low)->toHaveCount(1);
    expect($low[0]['stock'])->toBe(5);
    expect($low[0]['threshold'])->toBe(5);
});

test('reports page needs permission and honors period', function () {
    $this->actingAs(reportUser());

    $this->get(route('reports.index'))->assertForbidden();

    $this->actingAs(reportUser(['reports.view']));
    $master = reportMasterData();
    reportSale($master);

    $this->get(route('reports.index', ['period' => 'today']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports/index')
            ->where('period', 'today')
            ->where('overview.revenue', 54000)
            ->has('daily')
            ->where('inventoryValue', 0));

    $this->get(route('reports.index', ['period' => 'ngawur']))
        ->assertSessionHasErrors('period');
});
