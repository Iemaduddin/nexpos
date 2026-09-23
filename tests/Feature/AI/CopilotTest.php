<?php

use App\AI\AiException;
use App\AI\NEXPOSAssistant;
use App\AI\ToolRegistry;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    foreach (['ai.use', 'sales.view', 'inventory.view', 'customers.view', 'products.view', 'reports.finance.view'] as $name) {
        Permission::create(['name' => $name]);
    }
});

function copilotUser(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

function copilotMasterData(): array
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
    StockLevel::create(['store_id' => $store->id, 'product_id' => $product->id, 'qty_on_hand' => 3]);

    $makeSale = function (int $grand, $at) use ($store, $user, $product) {
        $sale = Sale::create([
            'number' => 'TRX-'.str()->random(8),
            'store_id' => $store->id,
            'cashier_id' => $user->id,
            'status' => 'completed',
            'subtotal' => $grand,
            'grand_total' => $grand,
            'paid_total' => $grand,
            'completed_at' => $at,
        ]);
        $sale->items()->create([
            'product_id' => $product->id,
            'qty' => 2,
            'unit_price' => 30000,
            'cost_price' => 20000,
            'subtotal' => $grand,
        ]);

        return $sale;
    };

    $makeSale(60000, now());
    $makeSale(30000, now()->subDay());

    $customer = Customer::create([
        'code' => 'C-'.$suffix,
        'name' => 'Sultan '.$suffix,
        'transaction_count' => 3,
        'total_spent' => 250000,
    ]);

    $supplier = Supplier::create(['code' => 'SUP-'.$suffix, 'name' => 'Supplier '.$suffix]);
    Purchase::create([
        'number' => 'PO-'.$suffix,
        'supplier_id' => $supplier->id,
        'store_id' => $store->id,
        'status' => 'received',
        'subtotal' => 100000,
        'grand_total' => 100000,
        'paid_amount' => 40000,
    ]);

    StockMovement::create([
        'product_id' => $product->id,
        'store_id' => $store->id,
        'type' => 'purchase',
        'qty_change' => 10,
        'qty_before' => 0,
        'qty_after' => 10,
        'created_by' => $user->id,
    ]);

    return ['product' => $product, 'customer' => $customer];
}

function fullUser(): User
{
    return copilotUser(['ai.use', 'sales.view', 'inventory.view', 'customers.view', 'products.view', 'reports.finance.view']);
}

test('sales comparison reports deltas', function () {
    copilotMasterData();
    $result = app(ToolRegistry::class)->run(fullUser(), 'get_sales_comparison', ['period' => 'today']);

    expect($result['current']['revenue'])->toBe(60000);
    expect($result['previous']['revenue'])->toBe(30000);
    expect($result['revenue_diff'])->toBe(30000);
    expect($result['revenue_pct'])->toBe(100);
});

test('comparison maps this_week to the trailing 7 days', function () {
    copilotMasterData();
    $result = app(ToolRegistry::class)->run(fullUser(), 'get_sales_comparison', ['period' => 'this_week']);

    expect($result['period_label'])->toBe('7 hari terakhir');
    expect($result['previous_label'])->toBe('7 hari sebelumnya');
});

test('assistant strips leaked think blocks from replies', function () {
    $user = copilotUser(['ai.use']);

    Http::fake([
        'localhost:11434/*' => Http::response([
            'message' => [
                'role' => 'assistant',
                'content' => "<think>\nReasoning here.\n</think>\n\nOmzet hari ini adalah Rp 60.000.",
            ],
        ]),
    ]);

    $result = app(NEXPOSAssistant::class)->chat($user, 'Berapa omzet?');

    expect($result['reply'])->toBe('Omzet hari ini adalah Rp 60.000.');
});

test('assistant strips orphan closing think tags', function () {
    $user = copilotUser(['ai.use']);

    Http::fake([
        'localhost:11434/*' => Http::response([
            'message' => [
                'role' => 'assistant',
                'content' => "Reasoning here.\n</think>\n\nOmzet Rp 60.000.",
            ],
        ]),
    ]);

    $result = app(NEXPOSAssistant::class)->chat($user, 'Berapa omzet?');

    expect($result['reply'])->toBe('Omzet Rp 60.000.');
});

test('profit summary needs finance permission', function () {
    copilotMasterData();

    try {
        app(ToolRegistry::class)->run(copilotUser(['sales.view']), 'get_profit_summary', ['period' => 'today']);
        $this->fail('Expected AiException.');
    } catch (AiException $e) {
        expect($e->getMessage())->toBe('Anda tidak memiliki izin untuk mengakses data ini.');
    }

    $result = app(ToolRegistry::class)->run(fullUser(), 'get_profit_summary', ['period' => 'today']);

    expect($result['revenue'])->toBe(60000);
    expect($result['profit'])->toBe(20000);
    expect($result['margin_pct'])->toBe(33);
});

test('inventory summary and movements', function () {
    $master = copilotMasterData();
    $registry = app(ToolRegistry::class);

    $summary = $registry->run(fullUser(), 'get_inventory_summary', []);

    expect($summary['tracked_products'])->toBe(1);
    expect($summary['low_stock_count'])->toBe(1);
    expect($summary['out_of_stock_count'])->toBe(0);

    $movements = $registry->run(fullUser(), 'get_stock_movements', ['type' => 'purchase', 'limit' => 5]);

    expect($movements['movements'])->toHaveCount(1);
    expect($movements['movements'][0]['product'])->toBe($master['product']->name);
});

test('customer summary and top customers', function () {
    $master = copilotMasterData();
    $registry = app(ToolRegistry::class);

    $summary = $registry->run(fullUser(), 'get_customer_summary', []);

    expect($summary['total_customers'])->toBe(1);
    expect($summary['repeat_customers'])->toBe(1);

    $top = $registry->run(fullUser(), 'get_top_customers', ['limit' => 3]);

    expect($top['customers'][0]['name'])->toBe($master['customer']->name);
    expect($top['customers'][0]['total_spent'])->toBe(250000);
});

test('product performance resolves by sku', function () {
    $master = copilotMasterData();
    $registry = app(ToolRegistry::class);

    $result = $registry->run(fullUser(), 'get_product_performance', [
        'product' => $master['product']->sku,
        'period' => 'today',
    ]);

    expect($result['qty_sold'])->toBe(2);
    expect($result['revenue'])->toBe(60000);
    expect($result['stock'])->toBe(3);

    try {
        $registry->run(fullUser(), 'get_product_performance', ['product' => 'tidak-ada', 'period' => 'today']);
        $this->fail('Expected AiException.');
    } catch (AiException $e) {
        expect($e->getMessage())->toBe('Produk tidak ditemukan.');
    }
});

test('purchase summary reports payable', function () {
    copilotMasterData();
    $result = app(ToolRegistry::class)->run(fullUser(), 'get_purchase_summary', ['period' => 'today']);

    expect($result['count'])->toBe(1);
    expect($result['grand_total'])->toBe(100000);
    expect($result['paid'])->toBe(40000);
    expect($result['payable'])->toBe(60000);
    expect($result['by_status'])->toBe(['received' => 1]);
});

test('briefing endpoint caches and falls back without ollama', function () {
    copilotMasterData();
    $this->actingAs(fullUser());

    Http::fake(['localhost:11434/*' => Http::response('boom', 500)]);

    $response = $this->postJson(route('ai.briefing'))->assertOk();
    expect($response->json('cached'))->toBeFalse();
    expect($response->json('briefing'))->toContain('Rp');

    $this->postJson(route('ai.briefing'))->assertOk()->assertJson(['cached' => true]);
    Http::assertSentCount(1);
});

test('briefing uses the model narration when available', function () {
    copilotMasterData();
    $this->actingAs(fullUser());

    Http::fake([
        'localhost:11434/*' => Http::response([
            'message' => ['role' => 'assistant', 'content' => 'Kemarin omzet Rp 30.000, naik.'],
        ]),
    ]);

    $this->postJson(route('ai.briefing'))
        ->assertOk()
        ->assertJson(['briefing' => 'Kemarin omzet Rp 30.000, naik.', 'cached' => false]);
});

test('briefing requires ai.use permission', function () {
    $this->actingAs(copilotUser(['sales.view']));

    $this->postJson(route('ai.briefing'))->assertForbidden();
});
