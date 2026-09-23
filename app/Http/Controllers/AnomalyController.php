<?php

namespace App\Http\Controllers;

use App\Models\AnomalyDetection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AnomalyController extends Controller
{
    /**
     * Mark a finding as reviewed or dismissed.
     */
    public function review(Request $request, AnomalyDetection $anomaly): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(['reviewed', 'dismissed'])],
        ]);

        if ($anomaly->status !== 'new') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Temuan ini sudah ditindaklanjuti.']);

            return to_route('dashboard');
        }

        $anomaly->update([
            'status' => $validated['status'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Temuan ditandai selesai.']);

        return to_route('dashboard');
    }
}
