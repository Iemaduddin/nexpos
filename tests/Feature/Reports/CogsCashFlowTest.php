<?php

use App\AI\AiException;
use App\AI\ToolRegistry;
use App\Models\Category;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchasePayment;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Services\PurchaseService;
use App\Services\ReportService;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    Permission::create(['name' => 'reports.view']);
    Permission::create(['name' => 'inventory.purchase']);
});

function cogsMasterData(): array
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

    return ['store' => $store, 'user' => $user, 'product' => $product, 'suffix' => $suffix];
}

function cogsSale(array $master): Sale
{
    $sale = Sale::create([
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
    ]);
    $sale->items()->create([
        'product_id' => $master['product']->id,
        'qty' => 2,
        'unit_price' => 30000,
        'cost_price' => 20000,
        'discount' => 1000,
        'subtotal' => 59000,
    ]);
    Payment::create([
        'sale_id' => $sale->id,
        'method' => 'cash',
        'amount' => 54000,
        'paid_at' => now(),
        'created_by' => $master['user']->id,
    ]);

    return $sale;
}

function cogsPurchase(array $master, int $grand = 100000): Purchase
{
    return Purchase::create([
        'number' => 'PO-'.str()->random(8),
        'supplier_id' => Supplier::create(['code' => 'SUP-'.str()->random(6), 'name' => 'Pemasok'])->id,
        'store_id' => $master['store']->id,
        'status' => 'ordered',
        'subtotal' => $grand,
        'discount' => 0,
        'tax' => 0,
        'grand_total' => $grand,
        'paid_amount' => 0,
        'payment_status' => 'unpaid',
        'created_by' => $master['user']->id,
    ]);
}

test('cogs summary nets returned items at original cost', function () {
    $master = cogsMasterData();
    $sale = cogsSale($master);
    $item = $sale->items()->firstOrFail();

    $return = SaleReturn::create([
        'number' => 'RTN-1',
        'sale_id' => $sale->id,
        'store_id' => $master['store']->id,
        'total_refund' => 29500,
        'created_by' => $master['user']->id,
    ]);
    $return->items()->create([
        'sale_item_id' => $item->id,
        'product_id' => $master['product']->id,
        'qty' => 1,
        'refund_amount' => 29500,
    ]);

    $service = app(ReportService::class);
    $range = $service->resolveRange('today');
    $cogs = $service->cogsSummary($range['start'], $range['end']);

    expect($cogs['gross_cogs'])->toBe(40000);
    expect($cogs['returned_cogs'])->toBe(20000);
    expect($cogs['net_cogs'])->toBe(20000);
    expect($cogs['net_revenue'])->toBe(24500);
    expect($cogs['gross_margin'])->toBe(4500);
    expect($cogs['margin_pct'])->toBe(18);
});

test('cogs by product carries refunds and margin per product', function () {
    $master = cogsMasterData();
    $sale = cogsSale($master);
    $item = $sale->items()->firstOrFail();

    $return = SaleReturn::create([
        'number' => 'RTN-1',
        'sale_id' => $sale->id,
        'store_id' => $master['store']->id,
        'total_refund' => 29500,
        'created_by' => $master['user']->id,
    ]);
    $return->items()->create([
        'sale_item_id' => $item->id,
        'product_id' => $master['product']->id,
        'qty' => 1,
        'refund_amount' => 29500,
    ]);

    $service = app(ReportService::class);
    $range = $service->resolveRange('today');
    $rows = $service->cogsByProduct($range['start'], $range['end'], 10);

    expect($rows)->toHaveCount(1);
    expect($rows[0]['qty'])->toBe(1.0);
    expect($rows[0]['revenue'])->toBe(59000);
    expect($rows[0]['refunds'])->toBe(29500);
    expect($rows[0]['cogs'])->toBe(20000);
    expect($rows[0]['margin'])->toBe(9500);
});

test('cash flow separates sales in, supplier out, and refunds out', function () {
    $master = cogsMasterData();
    cogsSale($master);
    $sale = Sale::latest('id')->firstOrFail();

    SaleReturn::create([
        'number' => 'RTN-1',
        'sale_id' => $sale->id,
        'store_id' => $master['store']->id,
        'total_refund' => 29500,
        'created_by' => $master['user']->id,
    ]);

    $purchase = cogsPurchase($master);
    app(PurchaseService::class)->recordPayment($purchase, 30000, $master['user']);

    $service = app(ReportService::class);
    $range = $service->resolveRange('today');
    $flow = $service->cashFlow($range['start'], $range['end']);

    expect($flow['opening_balance'])->toBe(0);
    expect($flow['cash_in'])->toBe(54000);
    expect($flow['cash_out_purchases'])->toBe(30000);
    expect($flow['cash_out_refunds'])->toBe(29500);
    expect($flow['cash_out'])->toBe(59500);
    expect($flow['net_flow'])->toBe(-5500);
    expect($flow['closing_balance'])->toBe(-5500);
    expect($flow['cash_in_by_method'])->toHaveCount(1);
    expect($flow['cash_in_by_method'][0]['method'])->toBe('cash');

    $today = collect($flow['daily'])->firstWhere('date', today()->toDateString());
    expect($today['in'])->toBe(54000);
    expect($today['out'])->toBe(59500);
    expect($today['net'])->toBe(-5500);
});

test('purchase payment writes dated history and updates status', function () {
    $master = cogsMasterData();
    $purchase = cogsPurchase($master);

    app(PurchaseService::class)->recordPayment($purchase, 30000, $master['user']);

    expect(PurchasePayment::where('purchase_id', $purchase->id)->count())->toBe(1);
    expect((int) PurchasePayment::where('purchase_id', $purchase->id)->sum('amount'))->toBe(30000);

    $purchase->refresh();
    expect($purchase->paid_amount)->toBe(30000);
    expect($purchase->payment_status)->toBe('partial');
});

test('reports page exposes cogs and cash flow props', function () {
    $user = User::factory()->create();
    $user->givePermissionTo(['reports.view']);
    $master = cogsMasterData();
    cogsSale($master);

    $this->actingAs($user)->get(route('reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports/index')
            ->has('cogs')
            ->where('cogs.net_cogs', 40000)
            ->has('cogsByProduct', 1)
            ->has('cashFlow')
            ->where('cashFlow.cash_in', 54000));
});

test('ai tools expose cogs and cash flow with authorization', function () {
    $master = cogsMasterData();
    cogsSale($master);

    $registry = app(ToolRegistry::class);
    expect($registry->has('get_cogs_summary'))->toBeTrue();
    expect($registry->has('get_cash_flow'))->toBeTrue();

    $finance = User::factory()->create();
    $finance->givePermissionTo(Permission::create(['name' => 'reports.finance.view']));

    $cogs = $registry->run($finance, 'get_cogs_summary', ['period' => 'today']);
    expect($cogs['gross_cogs'])->toBe(40000);
    expect($cogs['net_cogs'])->toBe(40000);

    $flow = $registry->run($finance, 'get_cash_flow', ['period' => 'today']);
    expect($flow['cash_in'])->toBe(54000);
    expect($flow)->not->toHaveKey('daily');

    $plain = User::factory()->create();

    try {
        $registry->run($plain, 'get_cash_flow', ['period' => 'today']);
        $this->fail('Expected AiException for unauthorized cash flow access.');
    } catch (AiException $e) {
        expect($e->getMessage())->toBe('Anda tidak memiliki izin untuk mengakses data ini.');
    }

    try {
        $registry->run($finance, 'get_cogs_summary', ['period' => 'kapan']);
        $this->fail('Expected AiException for invalid period.');
    } catch (AiException $e) {
        expect($e->getMessage())->toBe('Parameter tool tidak valid.');
    }
});

test('cogs and cash flow csv exports download with correct rows', function () {
    $user = User::factory()->create();
    $user->givePermissionTo(['reports.view']);
    $master = cogsMasterData();
    cogsSale($master);
    $this->actingAs($user);

    $cogs = $this->get(route('reports.export.cogs', ['period' => 'today']));
    $cogs->assertOk();
    expect($cogs->streamedContent())->toContain('Produk,SKU');
    expect($cogs->streamedContent())->toContain('40000');

    $cash = $this->get(route('reports.export.cash-flow', ['period' => 'today']));
    $cash->assertOk();
    expect($cash->streamedContent())->toContain('Saldo awal');
    expect($cash->streamedContent())->toContain('54000');
});

test('exports require reports.view permission', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('reports.export.cogs'))->assertForbidden();
    $this->get(route('reports.export.cash-flow'))->assertForbidden();
});
