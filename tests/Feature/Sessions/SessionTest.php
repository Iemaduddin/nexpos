<?php

use App\Models\CashSession;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockLevel;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    Permission::create(['name' => 'sales.view']);
    Permission::create(['name' => 'sales.create']);
    Permission::create(['name' => 'users.manage']);
});

function sessionUser(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

function sessionStore(): Store
{
    $suffix = str()->random(6);

    return Store::create(['code' => 'T-'.$suffix, 'name' => 'Toko '.$suffix, 'is_main' => true]);
}

function openSession(Store $store, User $user, int $opening = 50000): CashSession
{
    return CashSession::create([
        'store_id' => $store->id,
        'opened_by' => $user->id,
        'opening_balance' => $opening,
        'status' => 'open',
        'opened_at' => now(),
    ]);
}

test('guests are redirected to login', function () {
    $this->get(route('sessions.index'))->assertRedirect(route('login'));
});

test('users without permission cannot view sessions', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('sessions.index'))->assertForbidden();
});

test('users with view permission can visit the index', function () {
    $this->actingAs(sessionUser(['sales.view']));

    $this->get(route('sessions.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('sessions/index'));
});

test('a cashier can open a session for their store', function () {
    $user = sessionUser(['sales.create']);
    $store = sessionStore();
    $user->update(['store_id' => $store->id]);
    $this->actingAs($user);

    $response = $this->post(route('sessions.store'), ['opening_balance' => 50000]);

    $response->assertRedirect(route('pos.index'));
    $this->assertDatabaseHas('cash_sessions', [
        'store_id' => $store->id,
        'opened_by' => $user->id,
        'opening_balance' => 50000,
        'status' => 'open',
    ]);
});

test('a second open session for the same store is blocked', function () {
    $user = sessionUser(['sales.create']);
    $store = sessionStore();
    $user->update(['store_id' => $store->id]);
    openSession($store, $user);
    $this->actingAs($user);

    $this->post(route('sessions.store'), ['opening_balance' => 10000])
        ->assertRedirect(route('sessions.index'));

    expect(CashSession::where('store_id', $store->id)->where('status', 'open')->count())->toBe(1);
});

test('closing computes expected cash and difference', function () {
    $user = sessionUser(['sales.create', 'sales.view']);
    $store = sessionStore();
    $user->update(['store_id' => $store->id]);
    $this->actingAs($user);

    $session = openSession($store, $user, 50000);

    $suffix = str()->random(6);
    $product = Product::create([
        'sku' => 'SKU-'.$suffix,
        'name' => 'Kopi '.$suffix,
        'slug' => 'kopi-'.$suffix,
        'category_id' => Category::create(['name' => 'Minuman '.$suffix, 'slug' => 'minuman-'.$suffix])->id,
        'unit_id' => Unit::create(['name' => 'Pcs '.$suffix, 'symbol' => 'pcs-'.$suffix])->id,
        'cost_price' => 20000,
        'selling_price' => 30000,
    ]);
    StockLevel::create(['store_id' => $store->id, 'product_id' => $product->id, 'qty_on_hand' => 10]);

    $this->post(route('pos.checkout'), [
        'items' => [['product_id' => $product->id, 'qty' => 1, 'unit_price' => 30000]],
        'payments' => [['method' => 'cash', 'amount' => 30000]],
    ])->assertRedirect();

    // expected = 50000 + 30000 = 80000
    $this->patch(route('sessions.close', $session), ['closing_actual' => 79000])
        ->assertRedirect(route('sessions.index'));

    $session = $session->refresh();
    expect($session->status)->toBe('closed');
    expect($session->closing_expected)->toBe(80000);
    expect($session->difference)->toBe(-1000);
    expect($session->closed_by)->toBe($user->id);
});

test('only the opener or a manager can close a session', function () {
    $opener = sessionUser(['sales.create']);
    $other = sessionUser(['sales.create']);
    $store = sessionStore();
    $session = openSession($store, $opener);
    $this->actingAs($other);

    $this->patch(route('sessions.close', $session), ['closing_actual' => 50000])
        ->assertForbidden();
    expect($session->refresh()->status)->toBe('open');

    $other->givePermissionTo('users.manage');

    $this->patch(route('sessions.close', $session), ['closing_actual' => 50000])
        ->assertRedirect(route('sessions.index'));
    expect($session->refresh()->status)->toBe('closed');
});

test('checkout without an open session is rejected', function () {
    $user = sessionUser(['sales.create']);
    $store = sessionStore();
    $user->update(['store_id' => $store->id]);
    $this->actingAs($user);

    $suffix = str()->random(6);
    $product = Product::create([
        'sku' => 'SKU-'.$suffix,
        'name' => 'Kopi '.$suffix,
        'slug' => 'kopi-'.$suffix,
        'category_id' => Category::create(['name' => 'Minuman '.$suffix, 'slug' => 'minuman-'.$suffix])->id,
        'unit_id' => Unit::create(['name' => 'Pcs '.$suffix, 'symbol' => 'pcs-'.$suffix])->id,
        'cost_price' => 20000,
        'selling_price' => 30000,
    ]);

    $this->post(route('pos.checkout'), [
        'items' => [['product_id' => $product->id, 'qty' => 1, 'unit_price' => 30000]],
        'payments' => [['method' => 'cash', 'amount' => 30000]],
    ])->assertSessionHasErrors('session');
});
