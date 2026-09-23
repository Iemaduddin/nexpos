<?php

namespace App\AI\Tools;

use App\Models\CustomerSegment;
use App\Models\User;
use Illuminate\Validation\Rule;

class GetCustomerSegments extends AiTool
{
    public function name(): string
    {
        return 'get_customer_segments';
    }

    public function description(): string
    {
        return 'Sebaran segmen pelanggan (Champions, Loyal, At-risk, Lost, New) dari model RFM. Jangan karang segmen.';
    }

    public function parameters(): array
    {
        return [
            'segment' => [
                'type' => 'string',
                'enum' => ['Champions', 'Loyal', 'At-risk', 'Lost', 'New'],
                'description' => 'Saring satu segmen (opsional).',
            ],
            'limit' => [
                'type' => 'integer',
                'description' => 'Contoh pelanggan per segmen, 1 sampai 10.',
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
            'segment' => ['nullable', 'string', Rule::in(['Champions', 'Loyal', 'At-risk', 'Lost', 'New'])],
            'limit' => ['nullable', 'integer', 'min:1', 'max:10'],
        ];
    }

    public function authorize(User $user): bool
    {
        return $user->can('customers.view');
    }

    public function execute(User $user, array $args): array
    {
        $counts = CustomerSegment::query()
            ->selectRaw('segment, COUNT(*) as count')
            ->groupBy('segment')
            ->pluck('count', 'segment')
            ->map(fn ($count) => (int) $count)
            ->all();

        $limit = (int) ($args['limit'] ?? 3);
        $segments = $args['segment'] ?? null
            ? [$args['segment']]
            : ['Champions', 'Loyal', 'At-risk', 'Lost', 'New'];

        $samples = [];

        foreach ($segments as $segment) {
            $samples[$segment] = CustomerSegment::query()
                ->with('customer:id,name,total_spent')
                ->where('segment', $segment)
                ->orderByDesc('monetary')
                ->limit($limit)
                ->get()
                ->map(fn ($row) => [
                    'name' => $row->customer->name,
                    'total_spent' => $row->customer->total_spent,
                ])
                ->all();
        }

        return ['counts' => $counts, 'samples' => $samples];
    }
}
