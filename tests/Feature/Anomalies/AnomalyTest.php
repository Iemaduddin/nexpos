<?php

use App\AI\ToolRegistry;
use App\Models\AnomalyDetection;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use App\Services\AnomalyService;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    foreach (['ai.use', 'sales.view'] as $name) {
        Permission::create(['name' => $name]);
    }
});

function anomalyUser(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

function anomalyMasterData(): array
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

    return ['store' => $store, 'user' => $user, 'product' => $product];
}

function anomalySale(array $master, int $grand, $at): Sale
{
    $sale = Sale::create([
        'number' => 'TRX-'.str()->random(8),
        'store_id' => $master['store']->id,
        'cashier_id' => $master['user']->id,
        'status' => 'completed',
        'subtotal' => $grand,
        'grand_total' => $grand,
        'paid_total' => $grand,
        'completed_at' => $at,
    ]);
    $sale->items()->create([
        'product_id' => $master['product']->id,
        'qty' => 1,
        'unit_price' => $grand,
        'cost_price' => 20000,
        'subtotal' => $grand,
    ]);

    return $sale;
}

function fakeAnomalyMl(): void
{
    Http::fake([
        '127.0.0.1:8001/*' => Http::response([
            ['date' => today()->toDateString(), 'type' => 'revenue_drop', 'severity' => 'high', 'score' => 3.1, 'note' => 'revenue turun'],
        ]),
    ]);
}

test('scan stores findings and skips duplicates', function () {
    fakeAnomalyMl();
    anomalyMasterData();

    $service = app(AnomalyService::class);

    expect($service->scan())->toBe(1);
    expect(AnomalyDetection::count())->toBe(1);

    expect($service->scan())->toBe(0);
    expect(AnomalyDetection::count())->toBe(1);
});

test('scan returns zero when ml is down', function () {
    Http::fake(['127.0.0.1:8001/*' => Http::response('boom', 500)]);
    anomalyMasterData();

    expect(app(AnomalyService::class)->scan())->toBe(0);
});

test('command scans anomalies', function () {
    fakeAnomalyMl();
    anomalyMasterData();

    $this->artisan('anomalies:scan')->assertSuccessful();
    expect(AnomalyDetection::count())->toBe(1);
});

test('get_anomalies tool returns stored findings', function () {
    $master = anomalyMasterData();
    AnomalyDetection::create([
        'date' => today()->toDateString(),
        'type' => 'revenue_drop',
        'severity' => 'high',
        'score' => 3.1,
        'status' => 'new',
    ]);

    $user = anomalyUser(['sales.view']);
    $result = app(ToolRegistry::class)->run($user, 'get_anomalies', []);

    expect($result['anomalies'])->toHaveCount(1);
    expect($result['anomalies'][0]['type'])->toBe('revenue_drop');

    $filtered = app(ToolRegistry::class)->run($user, 'get_anomalies', ['status' => 'reviewed']);
    expect($filtered['anomalies'])->toHaveCount(0);
});

test('review marks findings and blocks repeats', function () {
    $this->actingAs(anomalyUser(['sales.view']));
    $finding = AnomalyDetection::create([
        'date' => today()->toDateString(),
        'type' => 'revenue_drop',
        'severity' => 'medium',
        'score' => 2.2,
        'status' => 'new',
    ]);

    $this->patch(route('anomalies.review', $finding), ['status' => 'reviewed'])
        ->assertRedirect(route('dashboard'));
    expect($finding->refresh()->status)->toBe('reviewed');

    $this->patch(route('anomalies.review', $finding), ['status' => 'dismissed'])
        ->assertRedirect(route('dashboard'));
    expect($finding->refresh()->status)->toBe('reviewed');

    $this->patch(route('anomalies.review', $finding), ['status' => 'ngawur'])
        ->assertSessionHasErrors('status');
});

test('review requires permission and dashboard shows anomalies', function () {
    $this->actingAs(anomalyUser([]));
    $finding = AnomalyDetection::create([
        'date' => today()->toDateString(),
        'type' => 'revenue_drop',
        'severity' => 'medium',
        'score' => 2.2,
        'status' => 'new',
    ]);

    $this->patch(route('anomalies.review', $finding), ['status' => 'reviewed'])
        ->assertForbidden();

    $this->actingAs(anomalyUser(['sales.view']));
    $this->get(route('dashboard'))->assertOk();
});
