<?php

use App\AI\ToolRegistry;
use App\Models\Category;
use App\Models\Customer;
use App\Models\CustomerSegment;
use App\Models\Product;
use App\Models\ProductAffinity;
use App\Models\Sale;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use App\Services\RecommendationService;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    foreach (['products.view', 'customers.view', 'reports.view'] as $name) {
        Permission::create(['name' => $name]);
    }
});

function mlMasterData(): array
{
    $suffix = str()->random(6);

    $store = Store::create(['code' => 'T-'.$suffix, 'name' => 'Toko '.$suffix, 'is_main' => true]);
    $user = User::factory()->create(['store_id' => $store->id]);
    $category = Category::create(['name' => 'Minuman '.$suffix, 'slug' => 'minuman-'.$suffix]);
    $unit = Unit::create(['name' => 'Pcs '.$suffix, 'symbol' => 'pcs-'.$suffix]);

    $makeProduct = function (string $name) use ($suffix, $category, $unit) {
        return Product::create([
            'sku' => str()->upper($name).'-'.$suffix,
            'name' => $name.' '.$suffix,
            'slug' => str()->slug($name).'-'.$suffix,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'cost_price' => 10000,
            'selling_price' => 20000,
        ]);
    };

    return [
        'store' => $store,
        'user' => $user,
        'a' => $makeProduct('Kopi'),
        'b' => $makeProduct('Gula'),
        'c' => $makeProduct('Teh'),
    ];
}

function mlSale(array $master, array $products, ?Customer $customer = null): Sale
{
    $sale = Sale::create([
        'number' => 'TRX-'.str()->random(8),
        'store_id' => $master['store']->id,
        'customer_id' => $customer?->id,
        'cashier_id' => $master['user']->id,
        'status' => 'completed',
        'subtotal' => 40000,
        'grand_total' => 40000,
        'paid_total' => 40000,
        'completed_at' => now(),
    ]);

    foreach ($products as $product) {
        $sale->items()->create([
            'product_id' => $product->id,
            'qty' => 1,
            'unit_price' => 20000,
            'cost_price' => 10000,
            'subtotal' => 20000,
        ]);
    }

    return $sale;
}

function mlUser(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

test('baskets only include multi-item sales', function () {
    $master = mlMasterData();
    mlSale($master, [$master['a'], $master['b']]);
    mlSale($master, [$master['a']]);

    $baskets = app(RecommendationService::class)->baskets();

    expect($baskets)->toHaveCount(1);
    expect($baskets[0])->toContain($master['a']->id, $master['b']->id);
});

test('recommend command stores pairs and replaces old ones', function () {
    $master = mlMasterData();
    mlSale($master, [$master['a'], $master['b']]);

    Http::fake([
        '127.0.0.1:8001/*' => Http::response([
            ['product_id' => $master['a']->id, 'with_id' => $master['b']->id, 'support' => 1.0, 'confidence' => 1.0],
            ['product_id' => $master['b']->id, 'with_id' => $master['a']->id, 'support' => 1.0, 'confidence' => 1.0],
        ]),
    ]);

    $this->artisan('recommend:generate')->assertSuccessful();
    expect(ProductAffinity::count())->toBe(2);

    $this->artisan('recommend:generate')->assertSuccessful();
    expect(ProductAffinity::count())->toBe(2);
});

test('recommend fails gracefully when ml is down', function () {
    Http::fake(['127.0.0.1:8001/*' => Http::response('boom', 500)]);
    $master = mlMasterData();
    mlSale($master, [$master['a'], $master['b']]);

    $this->artisan('recommend:generate')->assertFailed();
    expect(ProductAffinity::count())->toBe(0);
});

test('segment command stores rfm labels', function () {
    $master = mlMasterData();

    for ($i = 1; $i <= 8; $i++) {
        $suffix = str()->random(4);
        $customer = Customer::create([
            'code' => 'C-'.$suffix.$i,
            'name' => 'Pelanggan '.$i,
            'transaction_count' => $i,
            'total_spent' => $i * 100000,
        ]);

        $sale = mlSale($master, [$master['a']], $customer);
        $sale->update(['completed_at' => now()->subDays($i * 10)]);
    }

    Http::fake([
        '127.0.0.1:8001/*' => Http::response(
            collect(range(1, 8))->map(fn ($i) => [
                'id' => Customer::orderBy('id')->pluck('id')[$i - 1],
                'segment' => ['Champions', 'Loyal', 'At-risk', 'Lost', 'Champions', 'Loyal', 'At-risk', 'Lost'][$i - 1],
            ])->all()
        ),
    ]);

    $this->artisan('customers:segment')->assertSuccessful();
    expect(CustomerSegment::count())->toBe(8);
    expect(CustomerSegment::where('segment', 'Champions')->count())->toBe(2);
});

test('get_recommendations tool resolves by sku', function () {
    $master = mlMasterData();
    ProductAffinity::create([
        'product_id' => $master['a']->id,
        'with_product_id' => $master['b']->id,
        'support' => 0.5,
        'confidence' => 0.75,
    ]);

    $result = app(ToolRegistry::class)->run(mlUser(['products.view']), 'get_recommendations', [
        'product' => $master['a']->sku,
    ]);

    expect($result['available'])->toBeTrue();
    expect($result['recommendations'][0]['sku'])->toBe($master['b']->sku);
    expect($result['recommendations'][0]['confidence_pct'])->toBe(75);

    $missing = app(ToolRegistry::class)->run(mlUser(['products.view']), 'get_recommendations', [
        'product' => 'tidak-ada',
    ]);
    expect($missing['available'])->toBeFalse();
});

test('get_customer_segments tool reports counts', function () {
    $suffix = str()->random(6);
    $customer = Customer::create(['code' => 'C-'.$suffix, 'name' => 'Sultan', 'total_spent' => 500000]);
    CustomerSegment::create(['customer_id' => $customer->id, 'segment' => 'Champions', 'frequency' => 5, 'monetary' => 500000]);

    $result = app(ToolRegistry::class)->run(mlUser(['customers.view']), 'get_customer_segments', []);

    expect($result['counts'])->toBe(['Champions' => 1]);
    expect($result['samples']['Champions'][0]['name'])->toBe('Sultan');
});

test('reports page includes ml sections', function () {
    $this->actingAs(mlUser(['reports.view']));
    $master = mlMasterData();
    ProductAffinity::create([
        'product_id' => $master['a']->id,
        'with_product_id' => $master['b']->id,
        'support' => 0.5,
        'confidence' => 0.75,
    ]);

    $this->get(route('reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports/index')
            ->has('affinities', 1)
            ->has('segments', 0)
            ->has('forecasts', 0));
});
