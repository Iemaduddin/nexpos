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

function unitUser(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

function productWithUnit(Unit $unit): Product
{
    $category = Category::create(['name' => 'Minuman', 'slug' => 'minuman']);
    $brand = Brand::create(['name' => 'Umum', 'slug' => 'umum']);

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
    $this->get(route('units.index'))->assertRedirect(route('login'));
});

test('users without permission cannot view units', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('units.index'))->assertForbidden();
});

test('users with view permission cannot visit the index', function () {
    $this->actingAs(unitUser(['products.view']));

    $this->get(route('units.index'))->assertForbidden();
});

test('users with manage permission can visit the index', function () {
    $this->actingAs(unitUser(['products.manage']));

    $this->get(route('units.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('units/index'));
});

test('users with manage permission can store a unit', function () {
    $this->actingAs(unitUser(['products.view', 'products.manage']));

    $response = $this->post(route('units.store'), ['name' => 'Pieces', 'symbol' => 'pcs']);

    $response->assertRedirect(route('units.index'));
    $this->assertDatabaseHas('units', ['name' => 'Pieces', 'symbol' => 'pcs']);
});

test('name and symbol are required and unique', function () {
    $this->actingAs(unitUser(['products.manage']));
    Unit::create(['name' => 'Pieces', 'symbol' => 'pcs']);

    $this->post(route('units.store'), ['name' => '', 'symbol' => ''])
        ->assertSessionHasErrors(['name', 'symbol']);

    $this->post(route('units.store'), ['name' => 'Pieces', 'symbol' => 'pcs'])
        ->assertSessionHasErrors(['name', 'symbol']);
});

test('users with manage permission can update a unit', function () {
    $this->actingAs(unitUser(['products.manage']));
    $unit = Unit::create(['name' => 'Pc', 'symbol' => 'pc']);

    $response = $this->put(route('units.update', $unit), [
        'name' => 'Pieces',
        'symbol' => 'pcs',
    ]);

    $response->assertRedirect(route('units.index'));
    $this->assertDatabaseHas('units', ['id' => $unit->id, 'symbol' => 'pcs']);
});

test('a unit used by products cannot be deleted', function () {
    $this->actingAs(unitUser(['products.manage']));
    $unit = Unit::create(['name' => 'Pieces', 'symbol' => 'pcs']);
    productWithUnit($unit);

    $response = $this->delete(route('units.destroy', $unit));

    $response->assertRedirect(route('units.index'));
    $this->assertDatabaseHas('units', ['id' => $unit->id]);
});

test('an unused unit can be deleted', function () {
    $this->actingAs(unitUser(['products.manage']));
    $unit = Unit::create(['name' => 'Pieces', 'symbol' => 'pcs']);

    $this->delete(route('units.destroy', $unit))
        ->assertRedirect(route('units.index'));

    $this->assertDatabaseMissing('units', ['id' => $unit->id]);
});
