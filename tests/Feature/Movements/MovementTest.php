<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    Permission::create(['name' => 'inventory.view']);
    Permission::create(['name' => 'inventory.adjust']);
});

function movementUser(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

function movementMasterData(): array
{
    $suffix = str()->random(6);

    $store = Store::create(['code' => 'T-'.$suffix, 'name' => 'Toko '.$suffix, 'is_main' => true]);
    $product = Product::create([
        'sku' => 'SKU-'.$suffix,
        'name' => 'Kopi '.$suffix,
        'slug' => 'kopi-'.$suffix,
        'category_id' => Category::create(['name' => 'Minuman '.$suffix, 'slug' => 'minuman-'.$suffix])->id,
        'unit_id' => Unit::create(['name' => 'Pcs '.$suffix, 'symbol' => 'pcs-'.$suffix])->id,
        'cost_price' => 20000,
        'selling_price' => 30000,
    ]);

    return ['store' => $store, 'product' => $product];
}

test('guests are redirected to login', function () {
    $this->get(route('movements.index'))->assertRedirect(route('login'));
});

test('users without adjust permission cannot view movements', function () {
    $this->actingAs(User::factory()->create());
    $this->get(route('movements.index'))->assertForbidden();

    $this->actingAs(movementUser(['inventory.view']));
    $this->get(route('movements.index'))->assertForbidden();
});

test('users with adjust permission can visit the index', function () {
    $this->actingAs(movementUser(['inventory.adjust']));

    $this->get(route('movements.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('movements/index'));
});

test('index lists movements with product filter', function () {
    $this->actingAs(movementUser(['inventory.adjust']));
    $master = movementMasterData();

    StockMovement::create([
        'product_id' => $master['product']->id,
        'store_id' => $master['store']->id,
        'type' => 'adjustment',
        'qty_change' => -2,
        'qty_before' => 10,
        'qty_after' => 8,
        'notes' => 'Opname',
    ]);

    $this->get(route('movements.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('movements/index')
            ->has('movements.data', 1)
        );

    $this->get(route('movements.index', ['type' => 'sale']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('movements/index')
            ->has('movements.data', 0)
        );
});
