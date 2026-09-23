<?php

namespace App\AI\Tools;

use App\Models\Product;
use App\Models\User;
use App\Services\ForecastService;
use Illuminate\Validation\Rule;

class GetForecast extends AiTool
{
    public function __construct(private readonly ForecastService $forecasts) {}

    public function name(): string
    {
        return 'get_forecast';
    }

    public function description(): string
    {
        return 'Proyeksi permintaan produk dari model statistik (bukan tebakan). Cari dengan SKU atau nama. Jika belum ada proyeksi, katakan belum tersedia. Jangan karang angka.';
    }

    public function parameters(): array
    {
        return [
            'product' => [
                'type' => 'string',
                'description' => 'SKU atau nama produk.',
            ],
            'horizon' => [
                'type' => 'integer',
                'description' => '7 atau 30 hari ke depan.',
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
            'horizon' => ['nullable', 'integer', Rule::in([7, 30])],
        ];
    }

    public function authorize(User $user): bool
    {
        return $user->can('sales.view');
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

        $points = $this->forecasts->forProduct($product, (int) ($args['horizon'] ?? 7));

        if ($points->isEmpty()) {
            return ['available' => false, 'message' => 'Data proyeksi belum tersedia.'];
        }

        $first = $points->firstOrFail();

        $rows = [];

        foreach ($points as $point) {
            $rows[] = [
                'date' => $point->target_date->toDateString(),
                'qty' => (float) $point->predicted_qty,
                'lower' => (float) $point->lower_qty,
                'upper' => (float) $point->upper_qty,
            ];
        }

        return [
            'available' => true,
            'product' => $product->name,
            'sku' => $product->sku,
            'horizon_days' => (int) ($args['horizon'] ?? 7),
            'total_qty' => round($points->sum('predicted_qty'), 1),
            'model' => $first->model,
            'confidence' => $first->confidence,
            'points' => $rows,
        ];
    }
}
