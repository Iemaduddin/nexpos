<?php

namespace App\AI\Tools;

use App\Models\User;
use App\Services\ReportService;

class GetTopCustomers extends AiTool
{
    public function __construct(private readonly ReportService $reports) {}

    public function name(): string
    {
        return 'get_top_customers';
    }

    public function description(): string
    {
        return 'Pelanggan dengan total belanja terbesar. Jangan karang angka.';
    }

    public function parameters(): array
    {
        return [
            'limit' => [
                'type' => 'integer',
                'description' => 'Jumlah pelanggan, 1 sampai 10.',
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
            'limit' => ['nullable', 'integer', 'min:1', 'max:10'],
        ];
    }

    public function authorize(User $user): bool
    {
        return $user->can('customers.view');
    }

    public function execute(User $user, array $args): array
    {
        return [
            'customers' => $this->reports->topCustomers((int) ($args['limit'] ?? 5)),
        ];
    }
}
