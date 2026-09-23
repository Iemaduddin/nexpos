<?php

use App\Models\BusinessSetting;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    Permission::create(['name' => 'settings.manage']);
});

function posSettingsUser(): User
{
    $user = User::factory()->create();
    $user->givePermissionTo('settings.manage');

    return $user;
}

test('guests and unauthorized users cannot access POS settings', function () {
    $this->get(route('pos-settings.edit'))->assertRedirect(route('login'));

    $this->actingAs(User::factory()->create());
    $this->get(route('pos-settings.edit'))->assertForbidden();
    $this->patch(route('pos-settings.update'), [])->assertForbidden();
});

test('authorized users can view and update POS settings', function () {
    $this->actingAs(posSettingsUser());

    $this->get(route('pos-settings.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('settings/pos'));

    $this->patch(route('pos-settings.update'), [
        'enabled_payment_methods' => ['cash', 'qris'],
        'rounding_unit' => 100,
        'max_discount_percent' => 25,
    ])->assertRedirect(route('pos-settings.edit'));

    $settings = BusinessSetting::firstOrFail();

    expect($settings->enabledPaymentMethods())->toBe(['cash', 'qris']);
    expect($settings->rounding_unit)->toBe(100);
    expect((float) $settings->max_discount_percent)->toBe(25.0);
});

test('POS settings validate payment methods and rounding unit', function () {
    $this->actingAs(posSettingsUser());

    $this->patch(route('pos-settings.update'), [
        'enabled_payment_methods' => ['cash'],
        'rounding_unit' => 25,
        'max_discount_percent' => 25,
    ])->assertSessionHasErrors('rounding_unit');

    $this->patch(route('pos-settings.update'), [
        'enabled_payment_methods' => ['unknown'],
        'rounding_unit' => 100,
        'max_discount_percent' => 25,
    ])->assertSessionHasErrors('enabled_payment_methods.0');
});
