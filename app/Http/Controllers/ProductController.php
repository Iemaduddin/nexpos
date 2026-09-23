<?php

namespace App\Http\Controllers;

use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Models\Brand;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Product::class);

        $search = $request->string('search')->toString();
        $categoryId = $request->integer('category_id');

        $products = Product::query()
            ->with(['category:id,name', 'unit:id,symbol'])
            ->withSum('stockLevels as stock', 'qty_on_hand')
            ->when($search, fn ($query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('sku', 'like', "%{$search}%")
                ->orWhere('barcode', 'like', "%{$search}%")
            )
            ->when($categoryId, fn ($query) => $query->where('category_id', $categoryId))
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('products/index', [
            'products' => $products,
            'filters' => ['search' => $search, 'category_id' => $categoryId ?: null],
            'categories' => Category::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        Gate::authorize('create', Product::class);

        return Inertia::render('products/create', [
            'categories' => Category::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'brands' => Brand::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'units' => Unit::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'symbol']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreProductRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $defaultThreshold = (int) (BusinessSetting::first()?->default_low_stock_threshold ?? 0);

        if (! array_key_exists('low_stock_threshold', $validated) || $validated['low_stock_threshold'] === null) {
            $validated['low_stock_threshold'] = $defaultThreshold;
        }

        DB::transaction(function () use ($validated, $request, $defaultThreshold): void {
            $product = Product::create(Arr::except($validated, ['image', 'variants']));

            if ($request->hasFile('image')) {
                $product->update(['image_path' => $request->file('image')->store('products', 'public')]);
            }

            foreach ($this->variantRows($validated['variants'] ?? null, $defaultThreshold) as $row) {
                $product->variants()->create([
                    'name' => $row['name'],
                    'sku' => $row['sku'],
                    'barcode' => $row['barcode'],
                    'cost_price' => $row['cost_price'],
                    'selling_price' => $row['selling_price'],
                    'low_stock_threshold' => $row['low_stock_threshold'],
                ]);
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Produk berhasil ditambahkan.']);

        return to_route('products.index');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Product $product): Response
    {
        Gate::authorize('update', $product);

        $product->load('variants');

        return Inertia::render('products/edit', [
            'product' => $product,
            'categories' => Category::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'brands' => Brand::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'units' => Unit::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'symbol']),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateProductRequest $request, Product $product): RedirectResponse
    {
        $validated = $request->validated();
        $defaultThreshold = (int) (BusinessSetting::first()?->default_low_stock_threshold ?? 0);
        $rows = $this->variantRows($validated['variants'] ?? null, $defaultThreshold);

        $submittedIds = [];

        foreach ($rows as $row) {
            if ($row['id'] !== null) {
                $submittedIds[] = $row['id'];
            }
        }

        $blocked = $product->variants()->whereNotIn('id', $submittedIds)->get()->filter->isUsed();
        $firstBlocked = $blocked->first();

        if ($firstBlocked !== null) {
            Inertia::flash('toast', ['type' => 'error', 'message' => "Varian {$firstBlocked->name} tidak dapat dihapus karena sudah memiliki riwayat stok atau transaksi."]);

            return back();
        }

        DB::transaction(function () use ($validated, $request, $product, $rows): void {
            $oldImage = $product->image_path;

            $product->update(Arr::except($validated, ['image', 'variants']));

            if ($request->hasFile('image')) {
                $product->update(['image_path' => $request->file('image')->store('products', 'public')]);

                if ($oldImage) {
                    Storage::disk('public')->delete($oldImage);
                }
            }

            $keptIds = [];

            foreach ($rows as $row) {
                if ($row['id'] === null) {
                    $keptIds[] = $product->variants()->create([
                        'name' => $row['name'],
                        'sku' => $row['sku'],
                        'barcode' => $row['barcode'],
                        'cost_price' => $row['cost_price'],
                        'selling_price' => $row['selling_price'],
                        'low_stock_threshold' => $row['low_stock_threshold'],
                    ])->id;

                    continue;
                }

                $existing = $product->variants()->findOrFail($row['id']);
                $existing->update([
                    'name' => $row['name'],
                    'sku' => $row['sku'],
                    'barcode' => $row['barcode'],
                    'cost_price' => $row['cost_price'],
                    'selling_price' => $row['selling_price'],
                    'low_stock_threshold' => $row['low_stock_threshold'],
                ]);
                $keptIds[] = $existing->id;
            }

            $product->variants()->whereNotIn('id', $keptIds)->delete();
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Produk berhasil diperbarui.']);

        return to_route('products.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product): RedirectResponse
    {
        Gate::authorize('delete', $product);

        if ($product->saleItems()->exists() || $product->purchaseItems()->exists() || $product->stockMovements()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Produk tidak dapat dihapus karena sudah memiliki riwayat stok atau transaksi.']);

            return to_route('products.index');
        }

        DB::transaction(function () use ($product): void {
            $image = $product->image_path;

            $product->variants()->delete();
            $product->delete();

            if ($image) {
                Storage::disk('public')->delete($image);
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Produk berhasil dihapus.']);

        return to_route('products.index');
    }

    /**
     * Normalize submitted variant rows into a typed shape.
     *
     * @return list<array{id: int|null, name: string, sku: string, barcode: string|null, cost_price: int, selling_price: int, low_stock_threshold: int}>
     */
    private function variantRows(mixed $input, int $defaultThreshold = 0): array
    {
        if (! is_array($input)) {
            return [];
        }

        $rows = [];

        foreach ($input as $row) {
            if (! is_array($row) || ! isset($row['name'], $row['sku'])) {
                continue;
            }

            $rows[] = [
                'id' => isset($row['id']) ? (int) $row['id'] : null,
                'name' => (string) $row['name'],
                'sku' => (string) $row['sku'],
                'barcode' => isset($row['barcode']) ? (string) $row['barcode'] : null,
                'cost_price' => (int) ($row['cost_price'] ?? 0),
                'selling_price' => (int) ($row['selling_price'] ?? 0),
                'low_stock_threshold' => (int) ($row['low_stock_threshold'] ?? $defaultThreshold),
            ];
        }

        return $rows;
    }
}
