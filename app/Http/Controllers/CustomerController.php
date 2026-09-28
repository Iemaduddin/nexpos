<?php

namespace App\Http\Controllers;

use App\Http\Requests\Customer\StoreCustomerRequest;
use App\Http\Requests\Customer\UpdateCustomerRequest;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Customer::class);

        $search = $request->string('search')->toString();

        $customers = Customer::query()
            ->when($search, fn ($query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
            )
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('customers/index', [
            'customers' => $customers,
            'filters' => ['search' => $search],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreCustomerRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $customer = Customer::create([
                ...$request->validated(),
                'code' => 'TMP-'.Str::uuid(),
            ]);

            $customer->update([
                'code' => sprintf('C-%s-%04d', now()->format('Ymd'), $customer->id),
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pelanggan berhasil ditambahkan.']);

        return to_route('customers.index');
    }

    /**
     * Tambah pelanggan cepat dari kasir (JSON, tanpa pindah halaman).
     */
    public function quickStore(StoreCustomerRequest $request): JsonResponse
    {
        Gate::authorize('create', Customer::class);

        $customer = DB::transaction(function () use ($request): Customer {
            $customer = Customer::create([
                ...$request->validated(),
                'code' => 'TMP-'.Str::uuid(),
            ]);

            $customer->update([
                'code' => sprintf('C-%s-%04d', now()->format('Ymd'), $customer->id),
            ]);

            return $customer;
        });

        return response()->json([
            'customer' => $customer->only(['id', 'name', 'phone']),
        ], 201);
    }

    /**
     * Display the customer with recent sales history.
     */
    public function show(Customer $customer): Response
    {
        Gate::authorize('view', $customer);

        $sales = $customer->sales()
            ->orderByDesc('id')
            ->limit(10)
            ->get(['id', 'number', 'grand_total', 'paid_total', 'change_amount', 'status', 'completed_at']);

        return Inertia::render('customers/show', [
            'customer' => $customer,
            'sales' => $sales,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateCustomerRequest $request, Customer $customer): RedirectResponse
    {
        $customer->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pelanggan berhasil diperbarui.']);

        return to_route('customers.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Customer $customer): RedirectResponse
    {
        Gate::authorize('delete', $customer);

        if ($customer->sales()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Pelanggan tidak dapat dihapus karena memiliki riwayat transaksi.']);

            return to_route('customers.index');
        }

        $customer->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pelanggan berhasil dihapus.']);

        return to_route('customers.index');
    }
}
