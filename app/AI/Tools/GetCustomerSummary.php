<?php

namespace App\AI\Tools;

use App\Models\User;
use App\Services\ReportService;

class GetCustomerSummary extends AiTool
{
    public function __construct(private readonly ReportService $reports) {}

    public function name(): string
    {
        return 'get_customer_summary';
    }

    public function description(): string
    {
        return 'Ringkasan pelanggan: total, pelanggan berulang, dan pelanggan baru bulan ini. Jangan karang angka.';
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
        return $user->can('customers.view');
    }

    public function execute(User $user, array $args): array
    {
        return $this->reports->customerSummary();
    }
}
