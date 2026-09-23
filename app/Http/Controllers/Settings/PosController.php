<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdatePosSettingsRequest;
use App\Models\BusinessSetting;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    /**
     * Show POS configuration.
     */
    public function edit(): Response
    {
        $business = BusinessSetting::firstOrCreate(
            ['id' => 1],
            ['name' => config('app.name'), 'currency' => 'IDR', 'timezone' => 'Asia/Jakarta'],
        );

        return Inertia::render('settings/pos', [
            'business' => $business,
            'paymentMethods' => BusinessSetting::DEFAULT_PAYMENT_METHODS,
        ]);
    }

    /**
     * Update POS configuration.
     */
    public function update(UpdatePosSettingsRequest $request): RedirectResponse
    {
        $business = BusinessSetting::firstOrCreate(
            ['id' => 1],
            ['name' => (string) config('app.name'), 'currency' => 'IDR', 'timezone' => 'Asia/Jakarta'],
        );

        $business->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengaturan POS berhasil diperbarui.']);

        return to_route('pos-settings.edit');
    }
}
