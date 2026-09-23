<?php

namespace App\AI\Tools;

use App\Models\User;
use App\Services\ReportService;
use Illuminate\Validation\Rule;

class GetPurchaseSummary extends AiTool
{
    public function __construct(private readonly ReportService $reports) {}

    public function name(): string
    {
        return 'get_purchase_summary';
    }

    public function description(): string
    {
        return 'Ringkasan pembelian ke supplier: jumlah, total nilai, sudah dibayar, dan sisa utang periode ini. Jangan karang angka.';
    }

    public function parameters(): array
    {
        return [
            'period' => [
                'type' => 'string',
                'enum' => array_keys(GetSalesSummary::PERIODS),
                'description' => 'Periode laporan.',
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
        ];
    }

    public function authorize(User $user): bool
    {
        return $user->can('inventory.view');
    }

    public function execute(User $user, array $args): array
    {
        $range = $this->reports->resolveRange(GetSalesSummary::PERIODS[$args['period']]);

        return [
            'period' => $args['period'],
            ...$this->reports->purchaseSummary($range['start'], $range['end']),
        ];
    }
}
