<?php

namespace App\Http\Controllers;

use App\Http\Requests\Brand\StoreBrandRequest;
use App\Http\Requests\Brand\UpdateBrandRequest;
use App\Models\Brand;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class BrandController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Brand::class);

        $search = $request->string('search')->toString();

        $brands = Brand::query()
            ->withCount('products')
            ->when($search, fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('brands/index', [
            'brands' => $brands,
            'filters' => ['search' => $search],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        Gate::authorize('create', Brand::class);

        return Inertia::render('brands/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreBrandRequest $request): RedirectResponse
    {
        Brand::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Brand berhasil ditambahkan.']);

        return to_route('brands.index');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Brand $brand): Response
    {
        Gate::authorize('update', $brand);

        return Inertia::render('brands/edit', [
            'brand' => $brand,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateBrandRequest $request, Brand $brand): RedirectResponse
    {
        $brand->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Brand berhasil diperbarui.']);

        return to_route('brands.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Brand $brand): RedirectResponse
    {
        Gate::authorize('delete', $brand);

        if ($brand->products()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Brand tidak dapat dihapus karena masih memiliki produk.']);

            return to_route('brands.index');
        }

        $brand->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Brand berhasil dihapus.']);

        return to_route('brands.index');
    }
}
