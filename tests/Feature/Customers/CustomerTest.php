<?php

use App\Models\Customer;
use App\Models\Sale;
use App\Models\Store;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    Permission::create(['name' => 'customers.view']);
    Permission::create(['name' => 'customers.manage']);
});

function customerUser(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

test('guests are redirected to login', function () {
    $this->get(route('customers.index'))->assertRedirect(route('login'));
});

test('users without permission cannot view customers', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('customers.index'))->assertForbidden();
});

test('users with view permission can visit the index', function () {
    $this->actingAs(customerUser(['customers.view']));

    $this->get(route('customers.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('customers/index'));
});

test('users with manage permission can store a customer with auto code', function () {
    $this->actingAs(customerUser(['customers.view', 'customers.manage']));

    $response = $this->post(route('customers.store'), [
        'name' => 'Budi Santoso',
        'phone' => '081234567890',
    ]);

    $response->assertRedirect(route('customers.index'));

    $customer = Customer::where('phone', '081234567890')->firstOrFail();
    expect($customer->code)->toStartWith('C-');
});

test('phone must be unique and birthdate in the past', function () {
    $this->actingAs(customerUser(['customers.manage']));
    Customer::create(['code' => 'C-1', 'name' => 'Budi', 'phone' => '081234567890']);

    $this->post(route('customers.store'), ['name' => 'Andi', 'phone' => '081234567890'])
        ->assertSessionHasErrors('phone');

    $this->post(route('customers.store'), ['name' => 'Andi', 'birthdate' => now()->addDay()->toDateString()])
        ->assertSessionHasErrors('birthdate');
});

test('a customer with sales cannot be deleted', function () {
    $this->actingAs(customerUser(['customers.manage']));
    $customer = Customer::create(['code' => 'C-1', 'name' => 'Budi']);
    $store = Store::create(['code' => 'T-1', 'name' => 'Toko 1']);
    $user = User::factory()->create(['store_id' => $store->id]);

    Sale::create([
        'number' => 'TRX-1',
        'store_id' => $store->id,
        'customer_id' => $customer->id,
        'cashier_id' => $user->id,
        'status' => 'completed',
        'grand_total' => 50000,
        'paid_total' => 50000,
        'completed_at' => now(),
    ]);

    $response = $this->delete(route('customers.destroy', $customer));

    $response->assertRedirect(route('customers.index'));
    $this->assertDatabaseHas('customers', ['id' => $customer->id]);
});

test('a clean customer can be deleted', function () {
    $this->actingAs(customerUser(['customers.manage']));
    $customer = Customer::create(['code' => 'C-1', 'name' => 'Budi']);

    $this->delete(route('customers.destroy', $customer))
        ->assertRedirect(route('customers.index'));

    $this->assertDatabaseMissing('customers', ['id' => $customer->id]);
});

test('quick store returns the created customer as JSON without redirect', function () {
    $this->actingAs(customerUser(['customers.view', 'customers.manage']));

    $response = $this->postJson(route('customers.quick'), [
        'name' => 'Siti Kasir',
        'phone' => '081298765432',
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('customer.name', 'Siti Kasir')
        ->assertJsonPath('customer.phone', '081298765432');

    $customer = Customer::where('phone', '081298765432')->firstOrFail();
    expect($customer->code)->toStartWith('C-');
    expect($response->json('customer.id'))->toBe($customer->id);
});

test('quick store validates input and enforces permission', function () {
    $this->actingAs(customerUser(['customers.view', 'customers.manage']));

    $this->postJson(route('customers.quick'), ['name' => ''])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('name');

    $this->actingAs(customerUser(['customers.view']));

    $this->postJson(route('customers.quick'), ['name' => 'Andi'])
        ->assertForbidden();
});
