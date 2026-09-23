<?php

namespace App\AI\Tools;

use App\Models\User;
use App\Services\ReportService;
use Illuminate\Validation\Rule;

class GetSalesComparison extends AiTool
{
    public function __construct(private readonly ReportService $reports) {}

    public function name(): string
    {
        return 'get_sales_comparison';
    }

    public function description(): string
    {
        return 'Bandingkan penjualan periode ini dengan periode sebelumnya (omzet, selisih, persen perubahan). Gunakan untuk pertanyaan naik/turun/perbandingan. Jangan karang angka.';
    }

    public function parameters(): array
    {
        return [
            'period' => [
                'type' => 'string',
                'enum' => array_keys(GetSalesSummary::PERIODS),
                'description' => 'Periode yang dibandingkan.',
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
        return $user->can('sales.view');
    }

    public function execute(User $user, array $args): array
    {
        return $this->reports->comparison(GetSalesSummary::PERIODS[$args['period']]);
    }
}
