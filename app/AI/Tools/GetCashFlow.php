<?php

namespace App\AI\Tools;

use App\Models\User;
use App\Services\ReportService;
use Illuminate\Validation\Rule;

class GetCashFlow extends AiTool
{
    public function __construct(private readonly ReportService $reports) {}

    public function name(): string
    {
        return 'get_cash_flow';
    }

    public function description(): string
    {
        return 'Arus kas basis kas: saldo awal, kas masuk penjualan, kas keluar ke pemasok dan refund, serta saldo akhir periode ini. Gunakan untuk pertanyaan kas/modal kerja/saldo. Jangan karang angka.';
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
        $flow = $this->reports->cashFlow($range['start'], $range['end']);

        // Compact: daily series stays on the report page, not in the prompt.
        unset($flow['daily']);

        return array_merge(['period' => $args['period']], $flow);
    }
}
