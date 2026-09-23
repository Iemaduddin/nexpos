<?php

use App\Models\Store;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    Permission::create(['name' => 'settings.manage']);
});

function storeUser(): User
{
    $user = User::factory()->create();
    $user->givePermissionTo(['settings.manage']);

    return $user;
}

test('guests and unauthorized users cannot manage stores', function () {
    $this->get(route('stores.index'))->assertRedirect(route('login'));

    $this->actingAs(User::factory()->create());
    $this->get(route('stores.index'))->assertForbidden();
    $this->post(route('stores.store'), [])->assertForbidden();
});

test('authorized users can visit the index', function () {
    $this->actingAs(storeUser());

    $this->get(route('stores.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('stores/index'));
});

test('marking main switches the previous main store', function () {
    $this->actingAs(storeUser());
    $main = Store::create(['code' => 'T-1', 'name' => 'Utama', 'is_main' => true]);

    $this->post(route('stores.store'), [
        'code' => 'T-2',
        'name' => 'Cabang',
        'is_main' => true,
    ])->assertRedirect(route('stores.index'));

    expect($main->refresh()->is_main)->toBeFalse();
    expect(Store::where('code', 'T-2')->firstOrFail()->is_main)->toBeTrue();
    expect(Store::where('is_main', true)->count())->toBe(1);
});

test('code must be unique', function () {
    $this->actingAs(storeUser());
    Store::create(['code' => 'T-1', 'name' => 'Utama']);

    $this->post(route('stores.store'), ['code' => 'T-1', 'name' => 'Lain'])
        ->assertSessionHasErrors('code');
});

test('main store cannot be deleted', function () {
    $this->actingAs(storeUser());
    $main = Store::create(['code' => 'T-1', 'name' => 'Utama', 'is_main' => true]);

    $this->delete(route('stores.destroy', $main))->assertRedirect(route('stores.index'));
    $this->assertDatabaseHas('stores', ['id' => $main->id]);
});

test('a clean store can be deleted', function () {
    $this->actingAs(storeUser());
    $store = Store::create(['code' => 'T-9', 'name' => 'Sementara']);

    $this->delete(route('stores.destroy', $store))
        ->assertRedirect(route('stores.index'));

    $this->assertDatabaseMissing('stores', ['id' => $store->id]);
});
