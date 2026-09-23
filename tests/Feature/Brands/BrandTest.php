<?php

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    Permission::create(['name' => 'products.view']);
    Permission::create(['name' => 'products.manage']);
});

function brandUser(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

function productWithBrand(Brand $brand): Product
{
    $category = Category::create(['name' => 'Minuman', 'slug' => 'minuman']);
    $unit = Unit::create(['name' => 'Pcs', 'symbol' => 'pcs']);

    return Product::create([
        'sku' => 'SKU-'.str()->random(8),
        'name' => 'Produk Uji',
        'slug' => 'produk-uji-'.str()->random(6),
        'category_id' => $category->id,
        'brand_id' => $brand->id,
        'unit_id' => $unit->id,
        'cost_price' => 10000,
        'selling_price' => 15000,
    ]);
}

test('guests are redirected to login', function () {
    $this->get(route('brands.index'))->assertRedirect(route('login'));
});

test('users without permission cannot view brands', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('brands.index'))->assertForbidden();
});

test('users with view permission can visit the index', function () {
    $this->actingAs(brandUser(['products.view']));

    $this->get(route('brands.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('brands/index'));
});

test('users with manage permission can store a brand', function () {
    $this->actingAs(brandUser(['products.view', 'products.manage']));

    $response = $this->post(route('brands.store'), ['name' => 'Kapal Api']);

    $response->assertRedirect(route('brands.index'));
    $this->assertDatabaseHas('brands', ['name' => 'Kapal Api', 'slug' => 'kapal-api']);
});

test('name is required and slug must be unique', function () {
    $this->actingAs(brandUser(['products.manage']));
    Brand::create(['name' => 'Kapal Api', 'slug' => 'kapal-api']);

    $this->post(route('brands.store'), ['name' => ''])
        ->assertSessionHasErrors('name');

    $this->post(route('brands.store'), ['name' => 'Kapal Api'])
        ->assertSessionHasErrors('slug');
});

test('users with manage permission can update a brand', function () {
    $this->actingAs(brandUser(['products.manage']));
    $brand = Brand::create(['name' => 'Kapal', 'slug' => 'kapal']);

    $response = $this->put(route('brands.update', $brand), [
        'name' => 'Kapal Api',
        'slug' => 'kapal-api',
    ]);

    $response->assertRedirect(route('brands.index'));
    $this->assertDatabaseHas('brands', ['id' => $brand->id, 'name' => 'Kapal Api']);
});

test('a brand with products cannot be deleted', function () {
    $this->actingAs(brandUser(['products.manage']));
    $brand = Brand::create(['name' => 'Kapal Api', 'slug' => 'kapal-api']);
    productWithBrand($brand);

    $response = $this->delete(route('brands.destroy', $brand));

    $response->assertRedirect(route('brands.index'));
    $this->assertDatabaseHas('brands', ['id' => $brand->id]);
});

test('a clean brand can be deleted', function () {
    $this->actingAs(brandUser(['products.manage']));
    $brand = Brand::create(['name' => 'Kapal Api', 'slug' => 'kapal-api']);

    $this->delete(route('brands.destroy', $brand))
        ->assertRedirect(route('brands.index'));

    $this->assertDatabaseMissing('brands', ['id' => $brand->id]);
});
