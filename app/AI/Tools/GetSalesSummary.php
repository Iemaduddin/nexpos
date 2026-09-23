<?php

namespace App\AI\Tools;

use App\Models\User;
use App\Services\ReportService;
use Illuminate\Validation\Rule;

class GetSalesSummary extends AiTool
{
    public const PERIODS = [
        'today' => 'today',
        'yesterday' => 'yesterday',
        'this_week' => 'last_7_days',
        'this_month' => 'this_month',
    ];

    public function __construct(private readonly ReportService $reports) {}

    public function name(): string
    {
        return 'get_sales_summary';
    }

    public function description(): string
    {
        return 'Ringkasan penjualan: omzet, transaksi, rata-rata, item terjual, dan laba. Selalu gunakan tool ini untuk pertanyaan omzet/penjualan, jangan karang angka.';
    }

    public function parameters(): array
    {
        return [
            'period' => [
                'type' => 'string',
                'enum' => array_keys(self::PERIODS),
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
            'period' => ['required', 'string', Rule::in(array_keys(self::PERIODS))],
        ];
    }

    public function authorize(User $user): bool
    {
        return $user->can('sales.view');
    }

    public function execute(User $user, array $args): array
    {
        $range = $this->reports->resolveRange(self::PERIODS[$args['period']]);

        return [
            'period' => $args['period'],
            ...$this->reports->overview($range['start'], $range['end']),
        ];
    }
}
