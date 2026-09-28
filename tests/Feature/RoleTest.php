<?php

use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Permission::create(['name' => 'users.manage', 'guard_name' => 'web']);
    Permission::create(['name' => 'reports.view', 'guard_name' => 'web']);
});

test('guests are redirected to login', function () {
    $this->get(route('roles.index'))->assertRedirect(route('login'));
});

test('users without manage permission cannot view roles', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('roles.index'))->assertForbidden();
});

test('users with manage permission can view roles', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('users.manage');
    Role::create(['name' => 'cashier', 'guard_name' => 'web']);

    $this->actingAs($user);

    $this->get(route('roles.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('roles/index'));
});

test('users with manage permission can synchronize role permissions', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('users.manage');
    $role = Role::create(['name' => 'cashier', 'guard_name' => 'web']);
    $permission = Permission::where('name', 'reports.view')->firstOrFail();

    $this->actingAs($user);

    $this->patch(route('roles.update', $role), [
        'permissions' => [$permission->id],
    ])->assertRedirect(route('roles.index'));

    expect($role->fresh()->hasPermissionTo('reports.view'))->toBeTrue();
});

test('role permissions must belong to the web guard', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('users.manage');
    $role = Role::create(['name' => 'cashier', 'guard_name' => 'web']);

    $this->actingAs($user);

    $this->patch(route('roles.update', $role), [
        'permissions' => [999999],
    ])->assertSessionHasErrors('permissions.0');
});

test('users without manage permission cannot manage roles', function () {
    $this->actingAs(User::factory()->create());
    $role = Role::create(['name' => 'cashier', 'guard_name' => 'web']);

    $this->post(route('roles.store'), ['name' => 'baru'])->assertForbidden();
    $this->delete(route('roles.destroy', $role))->assertForbidden();
});

test('users with manage permission can create a role', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('users.manage');
    $this->actingAs($user);

    $this->post(route('roles.store'), ['name' => 'supervisor'])
        ->assertRedirect(route('roles.index'));

    $this->assertDatabaseHas('roles', ['name' => 'supervisor', 'guard_name' => 'web']);
});

test('role name must be unique and code-safe', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('users.manage');
    $this->actingAs($user);
    Role::create(['name' => 'kasir', 'guard_name' => 'web']);

    $this->post(route('roles.store'), ['name' => 'kasir'])
        ->assertSessionHasErrors('name');

    $this->post(route('roles.store'), ['name' => 'Kasir Baru'])
        ->assertSessionHasErrors('name');
});

test('users with manage permission can delete an unused role', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('users.manage');
    $this->actingAs($user);
    $role = Role::create(['name' => 'sementara', 'guard_name' => 'web']);

    $this->delete(route('roles.destroy', $role))
        ->assertRedirect(route('roles.index'));

    $this->assertDatabaseMissing('roles', ['id' => $role->id]);
});

test('roles in use cannot be deleted', function () {
    $user = User::factory()->create();
    $user->givePermissionTo('users.manage');
    $this->actingAs($user);
    $role = Role::create(['name' => 'kasir', 'guard_name' => 'web']);
    $user->assignRole($role);

    $this->delete(route('roles.destroy', $role))
        ->assertRedirect(route('roles.index'));

    $this->assertDatabaseHas('roles', ['id' => $role->id]);
});
