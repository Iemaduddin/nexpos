<?php

namespace App\AI\Tools;

use App\Models\AnomalyDetection;
use App\Models\User;
use Illuminate\Validation\Rule;

class GetAnomalies extends AiTool
{
    public function name(): string
    {
        return 'get_anomalies';
    }

    public function description(): string
    {
        return 'Temuan anomali penjualan dari model statistik (lonjakan/penurunan tak biasa). Gunakan untuk pertanyaan kejanggalan/aktivitas tidak biasa. Jangan karang temuan.';
    }

    public function parameters(): array
    {
        return [
            'status' => [
                'type' => 'string',
                'enum' => ['new', 'reviewed', 'dismissed'],
                'description' => 'Saring berdasar status (opsional, default new).',
            ],
            'limit' => [
                'type' => 'integer',
                'description' => 'Jumlah temuan, 1 sampai 10.',
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
            'status' => ['nullable', 'string', Rule::in(['new', 'reviewed', 'dismissed'])],
            'limit' => ['nullable', 'integer', 'min:1', 'max:10'],
        ];
    }

    public function authorize(User $user): bool
    {
        return $user->can('sales.view');
    }

    public function execute(User $user, array $args): array
    {
        $findings = AnomalyDetection::query()
            ->when($args['status'] ?? 'new', fn ($query, $status) => $query->where('status', $status))
            ->orderByDesc('date')
            ->orderByDesc('score')
            ->limit((int) ($args['limit'] ?? 5))
            ->get(['date', 'type', 'severity', 'score', 'detail', 'status']);

        $rows = [];

        foreach ($findings as $finding) {
            $rows[] = [
                'date' => $finding->date->toDateString(),
                'type' => $finding->type,
                'severity' => $finding->severity,
                'score' => (float) $finding->score,
                'note' => $finding->detail['note'] ?? null,
                'status' => $finding->status,
            ];
        }

        return ['anomalies' => $rows];
    }
}
