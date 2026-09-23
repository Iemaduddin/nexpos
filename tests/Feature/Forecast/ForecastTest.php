<?php

use App\AI\ToolRegistry;
use App\Models\Category;
use App\Models\Forecast;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use App\Services\ForecastService;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    foreach (['ai.use', 'sales.view'] as $name) {
        Permission::create(['name' => $name]);
    }
});

function forecastMasterData(): Product
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
    ]);

    $sale = Sale::create([
        'number' => 'TRX-'.$suffix,
        'store_id' => $store->id,
        'cashier_id' => $user->id,
        'status' => 'completed',
        'subtotal' => 60000,
        'grand_total' => 60000,
        'paid_total' => 60000,
        'completed_at' => now(),
    ]);
    $sale->items()->create([
        'product_id' => $product->id,
        'qty' => 2,
        'unit_price' => 30000,
        'cost_price' => 20000,
        'subtotal' => 60000,
    ]);

    return $product;
}

function fakeMl(): void
{
    Http::fake([
        '127.0.0.1:8001/*' => Http::response([
            'quantities' => [2.5, 2.6, 2.4, 2.7, 2.5, 2.3, 2.6],
            'lower' => [2.0, 2.1, 1.9, 2.2, 2.0, 1.8, 2.1],
            'upper' => [3.0, 3.1, 2.9, 3.2, 3.0, 2.8, 3.1],
            'model' => 'holt-winters-weekly',
            'confidence' => 'high',
        ]),
    ]);
}

test('series covers 90 days with zeros filled', function () {
    $product = forecastMasterData();

    $series = app(ForecastService::class)->seriesFor($product);

    expect($series)->toHaveCount(90);
    expect(array_sum($series))->toBe(2.0);
    expect(end($series))->toBe(2.0);
});

test('generate stores points and replaces old ones', function () {
    fakeMl();
    $product = forecastMasterData();
    $service = app(ForecastService::class);

    expect($service->generate($product, 7))->toBe(7);
    expect(Forecast::count())->toBe(7);

    $first = Forecast::orderBy('target_date')->firstOrFail();
    expect((float) $first->predicted_qty)->toBe(2.5);
    expect($first->model)->toBe('holt-winters-weekly');
    expect($first->target_date->toDateString())->toBe(today()->addDay()->toDateString());

    expect($service->generate($product, 7))->toBe(7);
    expect(Forecast::count())->toBe(7);
});

test('generate skips products when ml is down', function () {
    Http::fake(['127.0.0.1:8001/*' => Http::response('boom', 500)]);
    $product = forecastMasterData();

    expect(app(ForecastService::class)->generate($product, 7))->toBe(0);
    expect(Forecast::count())->toBe(0);
});

test('command generates and reports ml outage', function () {
    fakeMl();
    forecastMasterData();

    $this->artisan('forecast:generate', ['--horizon' => 7])->assertSuccessful();
    expect(Forecast::count())->toBe(7);

    $this->artisan('forecast:generate', ['--product' => 'tidak-ada'])->assertFailed();
});

test('get_forecast tool returns stored points', function () {
    fakeMl();
    $product = forecastMasterData();
    app(ForecastService::class)->generate($product, 7);

    $user = User::factory()->create();
    $user->givePermissionTo(['sales.view']);

    $result = app(ToolRegistry::class)->run($user, 'get_forecast', [
        'product' => $product->sku,
        'horizon' => 7,
    ]);

    expect($result['available'])->toBeTrue();
    expect($result['total_qty'])->toBe(17.6);
    expect($result['points'])->toHaveCount(7);

    $missing = app(ToolRegistry::class)->run($user, 'get_forecast', ['product' => 'tidak-ada']);
    expect($missing['available'])->toBeFalse();
});

test('digest summarizes weekly projection', function () {
    fakeMl();
    $product = forecastMasterData();
    app(ForecastService::class)->generate($product, 7);

    $digest = app(ForecastService::class)->digest(8);

    expect($digest)->toHaveCount(1);
    expect($digest[0]['sku'])->toBe($product->sku);
    expect($digest[0]['qty'])->toBe(17.6);
});
