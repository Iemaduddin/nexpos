<?php

namespace App\Http\Controllers;

use App\Models\StockMovement;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StockMovementController extends Controller
{
    /**
     * Display the stock movement ledger (kartu stok).
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();
        $type = $request->string('type')->toString();

        $movements = StockMovement::query()
            ->with([
                'product:id,name,sku',
                'variant:id,name',
                'store:id,name',
                'creator:id,name',
            ])
            ->when($search, fn ($query) => $query->whereHas('product',
                fn ($product) => $product
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
            ))
            ->when($type, fn ($query) => $query->where('type', $type))
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('movements/index', [
            'movements' => $movements,
            'filters' => ['search' => $search, 'type' => $type ?: null],
            'types' => [
                ['value' => 'sale', 'label' => 'Penjualan'],
                ['value' => 'purchase', 'label' => 'Pembelian'],
                ['value' => 'adjustment', 'label' => 'Opname'],
                ['value' => 'sale_return', 'label' => 'Retur'],
            ],
        ]);
    }
}
