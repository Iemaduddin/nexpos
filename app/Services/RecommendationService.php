<?php

namespace App\Services;

use App\Models\ProductAffinity;
use App\Models\Sale;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;

/**
 * "Often bought together" recommendations.
 *
 * Laravel builds baskets from sales; the counting runs in Python.
 */
class RecommendationService
{
    /**
     * Baskets of product ids from recent completed sales.
     *
     * @return list<list<int>>
     */
    public function baskets(int $days = 180, int $limit = 20000): array
    {
        $sales = Sale::query()
            ->whereIn('status', ['completed', 'partial_refund'])
            ->where('completed_at', '>=', now()->subDays($days))
            ->with('items:product_id,sale_id')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        $baskets = [];

        foreach ($sales as $sale) {
            $ids = [];

            foreach ($sale->items as $item) {
                $ids[] = $item->product_id;
            }

            $ids = array_values(array_unique($ids));

            if (count($ids) >= 2) {
                $baskets[] = $ids;
            }
        }

        return $baskets;
    }

    /**
     * Ask the ML service for pairs. Empty when unavailable.
     *
     * @param  list<list<int>>  $baskets
     * @return list<array<string, mixed>>
     */
    public function recommend(array $baskets, int $top = 50): array
    {
        try {
            $response = Http::baseUrl((string) config('services.ml.url'))
                ->withHeader('X-ML-Token', (string) config('services.ml.token'))
                ->timeout((int) config('services.ml.timeout', 60))
                ->post('/recommend', ['baskets' => $baskets, 'top' => $top]);

            if (! $response->successful()) {
                return [];
            }

            $data = $response->json();

            return is_array($data) ? array_values($data) : [];
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * Rebuild stored affinities. Returns stored pair count.
     */
    public function generate(): int
    {
        $pairs = $this->recommend($this->baskets());

        ProductAffinity::query()->delete();

        foreach ($pairs as $pair) {
            ProductAffinity::create([
                'product_id' => $pair['product_id'],
                'with_product_id' => $pair['with_id'],
                'support' => $pair['support'],
                'confidence' => $pair['confidence'],
            ]);
        }

        return count($pairs);
    }

    /**
     * Stored pairs for one product with names.
     *
     * @return Collection<int, ProductAffinity>
     */
    public function forProduct(int $productId, int $limit = 5): Collection
    {
        return ProductAffinity::query()
            ->with(['withProduct:id,name,sku,selling_price'])
            ->where('product_id', $productId)
            ->orderByDesc('confidence')
            ->limit($limit)
            ->get();
    }

    /**
     * Top pairs across the catalogue for reports.
     *
     * @return list<array<string, mixed>>
     */
    public function topPairs(int $limit = 8): array
    {
        $pairs = ProductAffinity::query()
            ->with(['product:id,name', 'withProduct:id,name'])
            ->orderByDesc('confidence')
            ->limit($limit)
            ->get();

        $rows = [];

        foreach ($pairs as $pair) {
            $rows[] = [
                'product' => $pair->product->name,
                'with' => $pair->withProduct->name,
                'confidence' => (float) $pair->confidence,
            ];
        }

        return $rows;
    }
}
