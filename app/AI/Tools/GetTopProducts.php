<?php

namespace App\AI\Tools;

use App\Models\User;
use App\Services\ReportService;
use Illuminate\Validation\Rule;

class GetTopProducts extends AiTool
{
    public function __construct(private readonly ReportService $reports) {}

    public function name(): string
    {
        return 'get_top_products';
    }

    public function description(): string
    {
        return 'Produk paling laku berdasarkan jumlah terjual beserta pendapatannya. Selalu gunakan tool ini untuk pertanyaan produk terlaris, jangan karang angka.';
    }

    public function parameters(): array
    {
        return [
            'period' => [
                'type' => 'string',
                'enum' => array_keys(GetSalesSummary::PERIODS),
                'description' => 'Periode laporan.',
            ],
            'limit' => [
                'type' => 'integer',
                'description' => 'Jumlah produk, 1 sampai 10.',
            ],
        ];
    }

    public function required(): array
    {
        return ['period'];
    }

    public function rules(): array
    {
        return [
            'period' => ['required', 'string', Rule::in(array_keys(GetSalesSummary::PERIODS))],
            'limit' => ['nullable', 'integer', 'min:1', 'max:10'],
        ];
    }

    public function authorize(User $user): bool
    {
        return $user->can('sales.view');
    }

    public function execute(User $user, array $args): array
    {
        $range = $this->reports->resolveRange(GetSalesSummary::PERIODS[$args['period']]);

        return [
            'period' => $args['period'],
            'products' => $this->reports->topProducts(
                $range['start'],
                $range['end'],
                (int) ($args['limit'] ?? 5)
            ),
        ];
    }
}
