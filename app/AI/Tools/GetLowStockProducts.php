<?php

namespace App\AI\Tools;

use App\Models\User;
use App\Services\ReportService;

class GetLowStockProducts extends AiTool
{
    public function __construct(private readonly ReportService $reports) {}

    public function name(): string
    {
        return 'get_low_stock_products';
    }

    public function description(): string
    {
        return 'Produk dengan stok menipis (di bawah batas minimum) beserta sisa dan batasnya. Selalu gunakan tool ini untuk pertanyaan stok menipis, jangan karang angka.';
    }

    public function parameters(): array
    {
        return [
            'limit' => [
                'type' => 'integer',
                'description' => 'Jumlah produk, 1 sampai 20.',
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
            'products' => $this->reports->lowStock((int) ($args['limit'] ?? 5)),
        ];
    }
}
