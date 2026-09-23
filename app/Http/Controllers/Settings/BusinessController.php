<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateBusinessRequest;
use App\Models\BusinessSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class BusinessController extends Controller
{
    /**
     * Show the business profile form.
     */
    public function edit(): Response
    {
        $business = BusinessSetting::firstOrCreate(
            ['id' => 1],
            ['name' => config('app.name'), 'currency' => 'IDR', 'timezone' => 'Asia/Jakarta']
        );

        Gate::authorize('view', $business);

        return Inertia::render('settings/business', [
            'business' => $business,
            'timezones' => UpdateBusinessRequest::TIMEZONES,
        ]);
    }

    /**
     * Update the business profile.
     */
    public function update(UpdateBusinessRequest $request): RedirectResponse
    {
        $business = BusinessSetting::firstOrCreate(
            ['id' => 1],
            ['name' => (string) config('app.name'), 'currency' => 'IDR', 'timezone' => 'Asia/Jakarta']
        );
        $validated = $request->validated();

        $oldLogo = $business->logo_path;

        $business->update(Arr::except($validated, ['logo']));

        if ($request->hasFile('logo')) {
            $business->update(['logo_path' => $request->file('logo')->store('business', 'public')]);

            if ($oldLogo) {
                Storage::disk('public')->delete($oldLogo);
            }
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Profil toko berhasil diperbarui.']);

        return to_route('business.edit');
    }
}
