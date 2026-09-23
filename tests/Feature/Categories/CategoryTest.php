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

function categoryUser(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

function makeProduct(Category $category): Product
{
    $unit = Unit::create(['name' => 'Pcs', 'symbol' => 'pcs']);
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
    $this->get(route('categories.index'))->assertRedirect(route('login'));
});

test('users without permission cannot view categories', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('categories.index'))->assertForbidden();
});

test('users with view permission can visit the index', function () {
    $this->actingAs(categoryUser(['products.view']));

    $this->get(route('categories.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('categories/index'));
});

test('users without manage permission cannot create categories', function () {
    $this->actingAs(categoryUser(['products.view']));

    $this->get(route('categories.create'))->assertForbidden();
    $this->post(route('categories.store'), ['name' => 'Minuman'])->assertForbidden();
});

test('users with manage permission can store a category', function () {
    $this->actingAs(categoryUser(['products.view', 'products.manage']));

    $response = $this->post(route('categories.store'), ['name' => 'Minuman']);

    $response->assertRedirect(route('categories.index'));
    $this->assertDatabaseHas('categories', ['name' => 'Minuman', 'slug' => 'minuman']);
});

test('slug is auto-generated from name when left blank', function () {
    $this->actingAs(categoryUser(['products.manage']));

    $this->post(route('categories.store'), ['name' => 'Makanan Ringan', 'slug' => '']);

    $this->assertDatabaseHas('categories', ['slug' => 'makanan-ringan']);
});

test('name is required and slug must be unique', function () {
    $this->actingAs(categoryUser(['products.manage']));
    Category::create(['name' => 'Minuman', 'slug' => 'minuman']);

    $this->post(route('categories.store'), ['name' => ''])
        ->assertSessionHasErrors('name');

    $this->post(route('categories.store'), ['name' => 'Minuman'])
        ->assertSessionHasErrors('slug');
});

test('users with manage permission can update a category', function () {
    $this->actingAs(categoryUser(['products.manage']));
    $category = Category::create(['name' => 'Minum', 'slug' => 'minum']);

    $response = $this->put(route('categories.update', $category), [
        'name' => 'Minuman',
        'slug' => 'minuman',
    ]);

    $response->assertRedirect(route('categories.index'));
    $this->assertDatabaseHas('categories', ['id' => $category->id, 'name' => 'Minuman']);
});

test('a category cannot be its own parent', function () {
    $this->actingAs(categoryUser(['products.manage']));
    $category = Category::create(['name' => 'Minuman', 'slug' => 'minuman']);

    $this->put(route('categories.update', $category), [
        'name' => 'Minuman',
        'slug' => 'minuman',
        'parent_id' => $category->id,
    ])->assertSessionHasErrors('parent_id');
});

test('a category with products cannot be deleted', function () {
    $this->actingAs(categoryUser(['products.manage']));
    $category = Category::create(['name' => 'Minuman', 'slug' => 'minuman']);
    makeProduct($category);

    $response = $this->delete(route('categories.destroy', $category));

    $response->assertRedirect(route('categories.index'));
    $this->assertDatabaseHas('categories', ['id' => $category->id]);
});

test('a clean category can be deleted', function () {
    $this->actingAs(categoryUser(['products.manage']));
    $category = Category::create(['name' => 'Minuman', 'slug' => 'minuman']);

    $this->delete(route('categories.destroy', $category))
        ->assertRedirect(route('categories.index'));

    $this->assertDatabaseMissing('categories', ['id' => $category->id]);
});
