<?php

use App\Models\Purchase;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    Permission::create(['name' => 'suppliers.view']);
    Permission::create(['name' => 'suppliers.manage']);
});

function supplierUser(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

test('guests are redirected to login', function () {
    $this->get(route('suppliers.index'))->assertRedirect(route('login'));
});

test('users without permission cannot view suppliers', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('suppliers.index'))->assertForbidden();
});

test('users with view permission can visit the index', function () {
    $this->actingAs(supplierUser(['suppliers.view']));

    $this->get(route('suppliers.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('suppliers/index'));
});

test('users with manage permission can store a supplier with auto code', function () {
    $this->actingAs(supplierUser(['suppliers.view', 'suppliers.manage']));

    $response = $this->post(route('suppliers.store'), [
        'name' => 'Distributor Maju',
        'contact_person' => 'Pak Andi',
    ]);

    $response->assertRedirect(route('suppliers.index'));

    $supplier = Supplier::where('name', 'Distributor Maju')->firstOrFail();
    expect($supplier->code)->toStartWith('SUP-');
});

test('name is required', function () {
    $this->actingAs(supplierUser(['suppliers.manage']));

    $this->post(route('suppliers.store'), ['name' => ''])
        ->assertSessionHasErrors('name');
});

test('a supplier with purchases cannot be deleted', function () {
    $this->actingAs(supplierUser(['suppliers.manage']));
    $supplier = Supplier::create(['code' => 'SUP-1', 'name' => 'Distributor Maju']);
    $store = Store::create(['code' => 'T-1', 'name' => 'Toko 1']);

    Purchase::create([
        'number' => 'PO-1',
        'supplier_id' => $supplier->id,
        'store_id' => $store->id,
        'status' => 'draft',
        'grand_total' => 100000,
    ]);

    $response = $this->delete(route('suppliers.destroy', $supplier));

    $response->assertRedirect(route('suppliers.index'));
    $this->assertDatabaseHas('suppliers', ['id' => $supplier->id]);
});

test('a clean supplier can be deleted', function () {
    $this->actingAs(supplierUser(['suppliers.manage']));
    $supplier = Supplier::create(['code' => 'SUP-1', 'name' => 'Distributor Maju']);

    $this->delete(route('suppliers.destroy', $supplier))
        ->assertRedirect(route('suppliers.index'));

    $this->assertDatabaseMissing('suppliers', ['id' => $supplier->id]);
});
