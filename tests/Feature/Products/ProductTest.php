<?php

use App\Models\Brand;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    Permission::create(['name' => 'products.view']);
    Permission::create(['name' => 'products.manage']);
});

function productUser(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

function productMasterData(): array
{
    return [
        'category' => Category::create(['name' => 'Minuman', 'slug' => 'minuman']),
        'brand' => Brand::create(['name' => 'Umum', 'slug' => 'umum']),
        'unit' => Unit::create(['name' => 'Pcs', 'symbol' => 'pcs']),
    ];
}

function productPayload(array $overrides = []): array
{
    $suffix = str()->random(6);

    return array_merge([
        'name' => 'Kopi Arabica',
        'sku' => 'KPA-250-'.$suffix,
        'category_id' => Category::create(['name' => 'Minuman '.$suffix, 'slug' => 'minuman-'.$suffix])->id,
        'brand_id' => Brand::create(['name' => 'Umum '.$suffix, 'slug' => 'umum-'.$suffix])->id,
        'unit_id' => Unit::create(['name' => 'Pcs '.$suffix, 'symbol' => 'pcs-'.$suffix])->id,
        'cost_price' => 20000,
        'selling_price' => 30000,
    ], $overrides);
}

function makeProductWithVariant(): Product
{
    $master = productMasterData();

    $product = Product::create([
        'name' => 'Kopi Arabica',
        'slug' => 'kopi-arabica',
        'sku' => 'KPA-250',
        'category_id' => $master['category']->id,
        'brand_id' => $master['brand']->id,
        'unit_id' => $master['unit']->id,
        'cost_price' => 20000,
        'selling_price' => 30000,
    ]);

    $product->variants()->create([
        'name' => '250 gram',
        'sku' => 'KPA-250G',
        'cost_price' => 20000,
        'selling_price' => 30000,
    ]);

    return $product;
}

test('guests are redirected to login', function () {
    $this->get(route('products.index'))->assertRedirect(route('login'));
});

test('users without permission cannot view products', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('products.index'))->assertForbidden();
});

test('users with view permission can visit the index', function () {
    $this->actingAs(productUser(['products.view']));

    $this->get(route('products.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('products/index'));
});

test('users with manage permission can store a product with variants', function () {
    $this->actingAs(productUser(['products.view', 'products.manage']));
    $master = productMasterData();

    $response = $this->post(route('products.store'), [
        'name' => 'Kopi Arabica',
        'sku' => 'KPA-250',
        'category_id' => $master['category']->id,
        'brand_id' => $master['brand']->id,
        'unit_id' => $master['unit']->id,
        'cost_price' => 20000,
        'selling_price' => 30000,
        'variants' => [
            ['name' => '250 gram', 'sku' => 'KPA-250G', 'cost_price' => 20000, 'selling_price' => 30000],
            ['name' => '500 gram', 'sku' => 'KPA-500G', 'cost_price' => 38000, 'selling_price' => 55000],
        ],
    ]);

    $response->assertRedirect(route('products.index'));
    $this->assertDatabaseHas('products', ['sku' => 'KPA-250', 'slug' => 'kopi-arabica']);
    $this->assertDatabaseCount('product_variants', 2);
});

test('new products and variants use the configured stock threshold by default', function () {
    BusinessSetting::create([
        'name' => 'Toko',
        'currency' => 'IDR',
        'timezone' => 'Asia/Jakarta',
        'default_low_stock_threshold' => 10,
    ]);
    $this->actingAs(productUser(['products.manage']));
    $master = productMasterData();

    $this->post(route('products.store'), [
        'name' => 'Kopi Arabica',
        'sku' => 'KPA-250',
        'category_id' => $master['category']->id,
        'brand_id' => $master['brand']->id,
        'unit_id' => $master['unit']->id,
        'cost_price' => 20000,
        'selling_price' => 30000,
        'variants' => [
            ['name' => '250 gram', 'sku' => 'KPA-250G', 'cost_price' => 20000, 'selling_price' => 30000],
        ],
    ])->assertRedirect(route('products.index'));

    $product = Product::where('sku', 'KPA-250')->firstOrFail();
    expect($product->low_stock_threshold)->toBe(10);
    expect($product->variants()->firstOrFail()->low_stock_threshold)->toBe(10);
});

test('product image is stored on the public disk', function () {
    Storage::fake('public');
    $this->actingAs(productUser(['products.manage']));
    $payload = productPayload();

    $this->post(route('products.store'), array_merge(
        $payload,
        ['image' => UploadedFile::fake()->image('kopi.jpg')]
    ))->assertRedirect(route('products.index'));

    $product = Product::where('sku', $payload['sku'])->firstOrFail();
    expect($product->image_path)->not->toBeNull();
    Storage::disk('public')->assertExists($product->image_path);
});

test('product validation rejects bad input', function () {
    $this->actingAs(productUser(['products.manage']));

    $this->post(route('products.store'), ['name' => ''])
        ->assertSessionHasErrors(['name', 'sku', 'category_id', 'unit_id', 'cost_price', 'selling_price']);

    $payload = productPayload(['sku' => 'KPA-DUP']);
    $this->post(route('products.store'), $payload)->assertRedirect(route('products.index'));

    $this->post(route('products.store'), productPayload(['sku' => 'KPA-DUP']))
        ->assertSessionHasErrors('sku');

    $this->post(route('products.store'), productPayload(['cost_price' => -1]))
        ->assertSessionHasErrors('cost_price');
});

test('users with manage permission can update a product and sync variants', function () {
    $this->actingAs(productUser(['products.manage']));
    $product = makeProductWithVariant();
    $kept = $product->variants()->firstOrFail();

    $response = $this->put(route('products.update', $product), [
        'name' => 'Kopi Arabica',
        'slug' => 'kopi-arabica',
        'sku' => 'KPA-250',
        'category_id' => $product->category_id,
        'brand_id' => $product->brand_id,
        'unit_id' => $product->unit_id,
        'cost_price' => 22000,
        'selling_price' => 32000,
        'variants' => [
            ['id' => $kept->id, 'name' => '250 gram', 'sku' => 'KPA-250G', 'cost_price' => 22000, 'selling_price' => 32000],
            ['name' => '1 kg', 'sku' => 'KPA-1KG', 'cost_price' => 75000, 'selling_price' => 100000],
        ],
    ]);

    $response->assertRedirect(route('products.index'));
    $this->assertDatabaseHas('products', ['id' => $product->id, 'selling_price' => 32000]);
    $this->assertDatabaseHas('product_variants', ['sku' => 'KPA-1KG']);
    expect($product->variants()->count())->toBe(2);
});

test('removing a used variant is blocked', function () {
    $this->actingAs(productUser(['products.manage']));
    $product = makeProductWithVariant();
    $variant = $product->variants()->firstOrFail();
    $store = Store::create(['code' => 'T-1', 'name' => 'Toko 1']);

    StockMovement::create([
        'product_id' => $product->id,
        'variant_id' => $variant->id,
        'store_id' => $store->id,
        'type' => 'purchase',
        'qty_change' => 10,
        'qty_before' => 0,
        'qty_after' => 10,
    ]);

    $response = $this->put(route('products.update', $product), [
        'name' => $product->name,
        'slug' => $product->slug,
        'sku' => $product->sku,
        'category_id' => $product->category_id,
        'unit_id' => $product->unit_id,
        'cost_price' => $product->cost_price,
        'selling_price' => $product->selling_price,
        'variants' => [],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('product_variants', ['id' => $variant->id]);
});

test('a product with stock history cannot be deleted', function () {
    $this->actingAs(productUser(['products.manage']));
    $product = makeProductWithVariant();
    $store = Store::create(['code' => 'T-1', 'name' => 'Toko 1']);

    StockMovement::create([
        'product_id' => $product->id,
        'store_id' => $store->id,
        'type' => 'purchase',
        'qty_change' => 10,
        'qty_before' => 0,
        'qty_after' => 10,
    ]);

    $response = $this->delete(route('products.destroy', $product));

    $response->assertRedirect(route('products.index'));
    $this->assertDatabaseHas('products', ['id' => $product->id]);
});

test('a clean product can be deleted', function () {
    $this->actingAs(productUser(['products.manage']));
    $product = makeProductWithVariant();

    $this->delete(route('products.destroy', $product))
        ->assertRedirect(route('products.index'));

    $this->assertDatabaseMissing('products', ['id' => $product->id]);
    $this->assertDatabaseCount('product_variants', 0);
});
