<?php

namespace App\AI\Tools;

use App\Models\User;
use App\Services\ReportService;
use Illuminate\Validation\Rule;

class GetCogsSummary extends AiTool
{
    public function __construct(private readonly ReportService $reports) {}

    public function name(): string
    {
        return 'get_cogs_summary';
    }

    public function description(): string
    {
        return 'Ringkasan HPP (harga pokok penjualan): HPP kotor, HPP retur, HPP bersih, dan marjin kotor periode ini. Gunakan untuk pertanyaan HPP/modal/untung kotor. Jangan karang angka.';
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

        return array_merge(
            ['period' => $args['period']],
            $this->reports->cogsSummary($range['start'], $range['end'])
        );
    }
}
