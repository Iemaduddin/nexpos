<?php

use App\Models\Store;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Permission::create(['name' => 'users.view']);
    Permission::create(['name' => 'users.manage']);
});

function userWithPermissions(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

test('guests are redirected to login', function () {
    $this->get(route('users.index'))->assertRedirect(route('login'));
});

test('users without permission cannot view users', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('users.index'))->assertForbidden();
});

test('users with view permission can visit the index', function () {
    $user = User::factory()->create();
    $user->givePermissionTo(['users.view']);

    $this->actingAs($user);

    $this->get(route('users.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('users/index'));
});

test('users with manage permission can create a user', function () {
    $role = Role::create(['name' => 'cashier', 'guard_name' => 'web']);
    $store = Store::create(['code' => 'T-1', 'name' => 'Toko 1', 'is_main' => true]);

    $this->actingAs(userWithPermissions(['users.manage']));

    $response = $this->post(route('users.store'), [
        'name' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'role' => 'cashier',
        'store_id' => $store->id,
    ]);

    $response->assertRedirect(route('users.index'));
    $this->assertDatabaseHas('users', [
        'name' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'store_id' => $store->id,
        'is_active' => true,
    ]);
});

test('email must be unique', function () {
    $this->actingAs(userWithPermissions(['users.manage']));
    User::create(['email' => 'budi@example.com']);

    $this->post(route('users.store'), [
        'name' => 'Budi',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'role' => 'cashier',
    ])->assertSessionHasErrors('email');
});

test('users with manage permission can update a user', function () {
    $user = User::factory()->create(['email' => 'budi@example.com']);
    $this->actingAs(userWithPermissions(['users.manage']));

    $response = $this->put(route('users.update', $user), [
        'name' => 'Budi Santoso',
        'email' => 'budi.santoso@example.com',
        'role' => 'cashier',
    ]);

    $response->assertRedirect(route('users.index'));
    $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'Budi Santoso']);
});

test('email must be unique on update', function () {
    $user1 = User::factory()->create(['email' => 'budi@example.com']);
    $user2 = User::factory()->create(['email' => 'andi@example.com']);
    $this->actingAs(userWithPermissions(['users.manage']));

    $this->put(route('users.update', $user2), [
        'name' => 'Andi',
        'email' => 'budi@example.com',
        'role' => 'cashier',
    ])->assertSessionHasErrors('email');
});

test('a user cannot delete themselves', function () {
    $user = User::factory()->create();
    $user->givePermissionTo(['users.manage']);
    $this->actingAs($user);

    $response = $this->delete(route('users.destroy', $user));

    $response->assertForbidden();
    $this->assertDatabaseHas('users', ['id' => $user->id]);
});

test('users with manage permission can delete other users', function () {
    $user = User::factory()->create();
    $user->givePermissionTo(['users.manage']);
    $this->actingAs($user);

    $this->delete(route('users.destroy', $user))
        ->assertRedirect(route('users.index'));

    $this->assertDatabaseMissing('users', ['id' => $user->id]);
});