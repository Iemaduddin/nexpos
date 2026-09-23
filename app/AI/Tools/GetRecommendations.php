<?php

namespace App\AI\Tools;

use App\Models\Product;
use App\Models\User;
use App\Services\RecommendationService;

class GetRecommendations extends AiTool
{
    public function __construct(private readonly RecommendationService $recommendations) {}

    public function name(): string
    {
        return 'get_recommendations';
    }

    public function description(): string
    {
        return 'Produk yang sering dibeli bersama produk tertentu, dari pola keranjang belanja. Cari dengan SKU atau nama. Jangan karang rekomendasi.';
    }

    public function parameters(): array
    {
        return [
            'product' => [
                'type' => 'string',
                'description' => 'SKU atau nama produk.',
            ],
            'limit' => [
                'type' => 'integer',
                'description' => 'Jumlah rekomendasi, 1 sampai 5.',
            ],
        ];
    }

    public function required(): array
    {
        return ['product'];
    }

    public function rules(): array
    {
        return [
            'product' => ['required', 'string', 'max:255'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:5'],
        ];
    }

    public function authorize(User $user): bool
    {
        return $user->can('products.view');
    }

    public function execute(User $user, array $args): array
    {
        $product = Product::query()
            ->where('sku', $args['product'])
            ->orWhere('name', 'like', "%{$args['product']}%")
            ->orderBy('id')
            ->first(['id', 'name', 'sku']);

        if (! $product) {
            return ['available' => false, 'message' => 'Produk tidak ditemukan.'];
        }

        $pairs = $this->recommendations->forProduct($product->id, (int) ($args['limit'] ?? 5));

        if ($pairs->isEmpty()) {
            return ['available' => false, 'message' => 'Belum ada data rekomendasi untuk produk ini.'];
        }

        return [
            'available' => true,
            'product' => $product->name,
            'recommendations' => $pairs->map(fn ($row) => [
                'name' => $row->withProduct->name,
                'sku' => $row->withProduct->sku,
                'selling_price' => $row->withProduct->selling_price,
                'confidence_pct' => (int) round((float) $row->confidence * 100),
            ])->all(),
        ];
    }
}
