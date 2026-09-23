<?php

namespace App\AI\Tools;

use App\Models\User;
use App\Services\ReportService;

class GetInventorySummary extends AiTool
{
    public function __construct(private readonly ReportService $reports) {}

    public function name(): string
    {
        return 'get_inventory_summary';
    }

    public function description(): string
    {
        return 'Ringkasan inventaris: jumlah produk terpantau, total unit, nilai stok, produk menipis dan habis. Jangan karang angka.';
    }

    public function parameters(): array
    {
        return [];
    }

    public function required(): array
    {
        return [];
    }

    public function rules(): array
    {
        return [];
    }

    public function authorize(User $user): bool
    {
        return $user->can('inventory.view');
    }

    public function execute(User $user, array $args): array
    {
        return $this->reports->inventorySummary();
    }
}
