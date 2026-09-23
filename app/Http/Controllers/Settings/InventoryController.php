<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateInventorySettingsRequest;
use App\Models\BusinessSetting;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    /**
     * Show inventory configuration.
     */
    public function edit(): Response
    {
        $business = BusinessSetting::firstOrCreate(
            ['id' => 1],
            ['name' => config('app.name'), 'currency' => 'IDR', 'timezone' => 'Asia/Jakarta'],
        );

        return Inertia::render('settings/inventory', [
            'business' => $business,
        ]);
    }

    /**
     * Update inventory configuration.
     */
    public function update(UpdateInventorySettingsRequest $request): RedirectResponse
    {
        $business = BusinessSetting::firstOrCreate(
            ['id' => 1],
            ['name' => (string) config('app.name'), 'currency' => 'IDR', 'timezone' => 'Asia/Jakarta'],
        );

        $business->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengaturan inventaris berhasil diperbarui.']);

        return to_route('inventory-settings.edit');
    }
}
