<?php

namespace App\Http\Controllers;

use App\Http\Requests\Supplier\StoreSupplierRequest;
use App\Http\Requests\Supplier\UpdateSupplierRequest;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Supplier::class);

        $search = $request->string('search')->toString();

        $suppliers = Supplier::query()
            ->withCount('purchases')
            ->when($search, fn ($query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
            )
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('suppliers/index', [
            'suppliers' => $suppliers,
            'filters' => ['search' => $search],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        Gate::authorize('create', Supplier::class);

        return Inertia::render('suppliers/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreSupplierRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $supplier = Supplier::create([
                ...$request->validated(),
                'code' => 'TMP-'.Str::uuid(),
            ]);

            $supplier->update([
                'code' => sprintf('SUP-%s-%04d', now()->format('Ymd'), $supplier->id),
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Supplier berhasil ditambahkan.']);

        return to_route('suppliers.index');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Supplier $supplier): Response
    {
        Gate::authorize('update', $supplier);

        return Inertia::render('suppliers/edit', [
            'supplier' => $supplier,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateSupplierRequest $request, Supplier $supplier): RedirectResponse
    {
        $supplier->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Supplier berhasil diperbarui.']);

        return to_route('suppliers.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Supplier $supplier): RedirectResponse
    {
        Gate::authorize('delete', $supplier);

        if ($supplier->purchases()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Supplier tidak dapat dihapus karena memiliki riwayat pembelian.']);

            return to_route('suppliers.index');
        }

        $supplier->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Supplier berhasil dihapus.']);

        return to_route('suppliers.index');
    }
}
