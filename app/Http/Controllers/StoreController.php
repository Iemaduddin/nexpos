<?php

namespace App\Http\Controllers;

use App\Http\Requests\Store\CreateStoreRequest;
use App\Http\Requests\Store\UpdateStoreRequest;
use App\Models\Store;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class StoreController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Store::class);

        $search = $request->string('search')->toString();

        $stores = Store::query()
            ->withCount(['users', 'sales', 'purchases'])
            ->when($search, fn ($query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%")
            )
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('stores/index', [
            'stores' => $stores,
            'filters' => ['search' => $search],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        Gate::authorize('create', Store::class);

        return Inertia::render('stores/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(CreateStoreRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated): void {
            if (! empty($validated['is_main'])) {
                Store::query()->update(['is_main' => false]);
            }

            Store::create($validated);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Gerai berhasil ditambahkan.']);

        return to_route('stores.index');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Store $store): Response
    {
        Gate::authorize('update', $store);

        return Inertia::render('stores/edit', [
            'store' => $store,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateStoreRequest $request, Store $store): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $store): void {
            if (! empty($validated['is_main'])) {
                Store::query()->where('id', '!=', $store->id)->update(['is_main' => false]);
            }

            $store->update($validated);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Gerai berhasil diperbarui.']);

        return to_route('stores.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Store $store): RedirectResponse
    {
        Gate::authorize('delete', $store);

        if ($store->is_main) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Gerai utama tidak dapat dihapus.']);

            return to_route('stores.index');
        }

        if ($store->users()->exists() || $store->sales()->exists() || $store->purchases()->exists() || $store->stockLevels()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Gerai tidak dapat dihapus karena masih memiliki data terkait.']);

            return to_route('stores.index');
        }

        $store->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Gerai berhasil dihapus.']);

        return to_route('stores.index');
    }
}
