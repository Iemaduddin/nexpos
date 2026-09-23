<?php

namespace App\Http\Controllers;

use App\Http\Requests\Unit\StoreUnitRequest;
use App\Http\Requests\Unit\UpdateUnitRequest;
use App\Models\Unit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class UnitController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Unit::class);

        $search = $request->string('search')->toString();

        $units = Unit::query()
            ->withCount('products')
            ->when($search, fn ($query) => $query->where('name', 'like', "%{$search}%")->orWhere('symbol', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('units/index', [
            'units' => $units,
            'filters' => ['search' => $search],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        Gate::authorize('create', Unit::class);

        return Inertia::render('units/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreUnitRequest $request): RedirectResponse
    {
        Unit::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Satuan berhasil ditambahkan.']);

        return to_route('units.index');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Unit $unit): Response
    {
        Gate::authorize('update', $unit);

        return Inertia::render('units/edit', [
            'unit' => $unit,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateUnitRequest $request, Unit $unit): RedirectResponse
    {
        $unit->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Satuan berhasil diperbarui.']);

        return to_route('units.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Unit $unit): RedirectResponse
    {
        Gate::authorize('delete', $unit);

        if ($unit->products()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Satuan tidak dapat dihapus karena masih dipakai produk.']);

            return to_route('units.index');
        }

        $unit->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Satuan berhasil dihapus.']);

        return to_route('units.index');
    }
}
