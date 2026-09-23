<?php

namespace App\AI\Tools;

use App\Models\User;
use App\Services\ReportService;
use Illuminate\Validation\Rule;

class GetProductPerformance extends AiTool
{
    public function __construct(private readonly ReportService $reports) {}

    public function name(): string
    {
        return 'get_product_performance';
    }

    public function description(): string
    {
        return 'Performa satu produk: terjual, pendapatan, laba, dan stok saat ini. Cari dengan SKU atau nama. Jangan karang angka.';
    }

    public function parameters(): array
    {
        return [
            'product' => [
                'type' => 'string',
                'description' => 'SKU atau nama produk.',
            ],
            'period' => [
                'type' => 'string',
                'enum' => array_keys(GetSalesSummary::PERIODS),
                'description' => 'Periode laporan.',
            ],
        ];
    }

    public function required(): array
    {
        return ['product', 'period'];
    }

    public function rules(): array
    {
        return [
            'product' => ['required', 'string', 'max:255'],
            'period' => ['required', 'string', Rule::in(array_keys(GetSalesSummary::PERIODS))],
        ];
    }

    public function authorize(User $user): bool
    {
        return $user->can('products.view');
    }

    public function execute(User $user, array $args): array
    {
        $range = $this->reports->resolveRange(GetSalesSummary::PERIODS[$args['period']]);

        return [
            'period' => $args['period'],
            ...$this->reports->productPerformance($args['product'], $range['start'], $range['end']),
        ];
    }
}
