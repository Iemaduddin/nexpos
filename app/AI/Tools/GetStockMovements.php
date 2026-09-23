<?php

namespace App\AI\Tools;

use App\Models\User;
use App\Services\ReportService;
use Illuminate\Validation\Rule;

class GetStockMovements extends AiTool
{
    public function __construct(private readonly ReportService $reports) {}

    public function name(): string
    {
        return 'get_stock_movements';
    }

    public function description(): string
    {
        return 'Riwayat pergerakan stok terbaru (masuk/keluar, pembelian, penjualan, penyesuaian). Jangan karang angka.';
    }

    public function parameters(): array
    {
        return [
            'type' => [
                'type' => 'string',
                'enum' => ['purchase', 'sale', 'sale_return', 'purchase_return', 'adjustment', 'transfer', 'opening'],
                'description' => 'Saring berdasarkan jenis pergerakan (opsional).',
            ],
            'limit' => [
                'type' => 'integer',
                'description' => 'Jumlah data, 1 sampai 20.',
            ],
        ];
    }

    public function required(): array
    {
        return [];
    }

    public function rules(): array
    {
        return [
            'type' => ['nullable', 'string', Rule::in(['purchase', 'sale', 'sale_return', 'purchase_return', 'adjustment', 'transfer', 'opening'])],
            'limit' => ['nullable', 'integer', 'min:1', 'max:20'],
        ];
    }

    public function authorize(User $user): bool
    {
        return $user->can('inventory.view');
    }

    public function execute(User $user, array $args): array
    {
        return [
            'movements' => $this->reports->recentMovements(
                (int) ($args['limit'] ?? 10),
                $args['type'] ?? null
            ),
        ];
    }
}
