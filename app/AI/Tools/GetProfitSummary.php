<?php

namespace App\AI\Tools;

use App\Models\User;
use App\Services\ReportService;
use Illuminate\Validation\Rule;

class GetProfitSummary extends AiTool
{
    public function __construct(private readonly ReportService $reports) {}

    public function name(): string
    {
        return 'get_profit_summary';
    }

    public function description(): string
    {
        return 'Ringkasan laba: pendapatan, refund, dan laba kotor periode ini. Gunakan untuk pertanyaan untung/laba/profit. Jangan karang angka.';
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
        return $user->can('reports.finance.view');
    }

    public function execute(User $user, array $args): array
    {
        $range = $this->reports->resolveRange(GetSalesSummary::PERIODS[$args['period']]);
        $overview = $this->reports->overview($range['start'], $range['end']);

        return [
            'period' => $args['period'],
            'revenue' => $overview['revenue'],
            'refunds' => $overview['refunds'],
            'profit' => $overview['profit'],
            'margin_pct' => $overview['revenue'] > 0
                ? (int) round($overview['profit'] / $overview['revenue'] * 100)
                : null,
        ];
    }
}
