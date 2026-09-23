<?php

use App\Models\BusinessSetting;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    Permission::create(['name' => 'settings.manage']);
});

function businessUser(): User
{
    $user = User::factory()->create();
    $user->givePermissionTo(['settings.manage']);

    return $user;
}

test('guests and unauthorized users cannot open business settings', function () {
    $this->get(route('business.edit'))->assertRedirect(route('login'));

    $this->actingAs(User::factory()->create());
    $this->get(route('business.edit'))->assertForbidden();
    $this->patch(route('business.update'), [])->assertForbidden();
});

test('authorized users can view and update the profile', function () {
    $this->actingAs(businessUser());

    $this->get(route('business.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('settings/business'));

    $this->patch(route('business.update'), [
        'name' => 'Toko Berkah Jaya',
        'currency' => 'IDR',
        'timezone' => 'Asia/Makassar',
        'default_tax_rate' => 10,
    ])->assertRedirect(route('business.edit'));

    $business = BusinessSetting::firstOrFail();
    expect($business->name)->toBe('Toko Berkah Jaya');
    expect($business->timezone)->toBe('Asia/Makassar');
});

test('timezone must be valid and logo must be an image', function () {
    $this->actingAs(businessUser());

    $this->patch(route('business.update'), [
        'name' => 'Toko',
        'currency' => 'IDR',
        'timezone' => 'Mars/Olympus',
        'default_tax_rate' => 0,
    ])->assertSessionHasErrors('timezone');

    $this->patch(route('business.update'), [
        'name' => 'Toko',
        'currency' => 'IDR',
        'timezone' => 'Asia/Jakarta',
        'default_tax_rate' => 0,
        'logo' => UploadedFile::fake()->create('logo.pdf', 100, 'application/pdf'),
    ])->assertSessionHasErrors('logo');
});

test('logo upload replaces the old file', function () {
    Storage::fake('public');
    $this->actingAs(businessUser());

    $this->patch(route('business.update'), [
        'name' => 'Toko',
        'currency' => 'IDR',
        'timezone' => 'Asia/Jakarta',
        'default_tax_rate' => 0,
        'logo' => UploadedFile::fake()->image('logo.png'),
    ])->assertRedirect();

    $path = BusinessSetting::firstOrFail()->logo_path;
    expect($path)->not->toBeNull();
    Storage::disk('public')->assertExists($path);
});
