<?php

use App\Models\BusinessSetting;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    Permission::create(['name' => 'settings.manage']);
});

function inventorySettingsUser(): User
{
    $user = User::factory()->create();
    $user->givePermissionTo('settings.manage');

    return $user;
}

test('guests and unauthorized users cannot access inventory settings', function () {
    $this->get(route('inventory-settings.edit'))->assertRedirect(route('login'));

    $this->actingAs(User::factory()->create());
    $this->get(route('inventory-settings.edit'))->assertForbidden();
    $this->patch(route('inventory-settings.update'), [])->assertForbidden();
});

test('authorized users can view and update inventory settings', function () {
    $this->actingAs(inventorySettingsUser());

    $this->get(route('inventory-settings.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('settings/inventory'));

    $this->patch(route('inventory-settings.update'), [
        'default_low_stock_threshold' => 10,
    ])->assertRedirect(route('inventory-settings.edit'));

    expect(BusinessSetting::firstOrFail()->default_low_stock_threshold)->toBe(10);
});

test('inventory threshold must be a non-negative integer', function () {
    $this->actingAs(inventorySettingsUser());

    $this->patch(route('inventory-settings.update'), [
        'default_low_stock_threshold' => -1,
    ])->assertSessionHasErrors('default_low_stock_threshold');
});
