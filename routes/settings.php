<?php

use App\Http\Controllers\Settings\BusinessController;
use App\Http\Controllers\Settings\InventoryController;
use App\Http\Controllers\Settings\PosController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('settings/business', [BusinessController::class, 'edit'])
        ->middleware('permission:settings.manage')
        ->name('business.edit');
    Route::patch('settings/business', [BusinessController::class, 'update'])
        ->middleware('permission:settings.manage')
        ->name('business.update');
    Route::get('settings/pos', [PosController::class, 'edit'])
        ->middleware('permission:settings.manage')
        ->name('pos-settings.edit');
    Route::patch('settings/pos', [PosController::class, 'update'])
        ->middleware('permission:settings.manage')
        ->name('pos-settings.update');
    Route::get('settings/inventory', [InventoryController::class, 'edit'])
        ->middleware('permission:settings.manage')
        ->name('inventory-settings.edit');
    Route::patch('settings/inventory', [InventoryController::class, 'update'])
        ->middleware('permission:settings.manage')
        ->name('inventory-settings.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/security', [SecurityController::class, 'edit'])
        ->middleware(RequirePassword::class)
        ->name('security.edit');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');
});

Route::get('.well-known/passkey-endpoints', function () {
    return response()->json([
        'enroll' => route('security.edit'),
        'manage' => route('security.edit'),
    ]);
})->name('well-known.passkeys');
