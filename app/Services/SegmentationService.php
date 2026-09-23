<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerSegment;
use App\Models\Sale;
use Illuminate\Support\Facades\Http;

/**
 * RFM customer segmentation.
 *
 * Laravel computes recency/frequency/monetary; clustering runs in Python.
 */
class SegmentationService
{
    /**
     * RFM rows for customers with at least one completed sale.
     *
     * @return list<array{id: int, recency: float, frequency: float, monetary: float}>
     */
    public function rfmRows(): array
    {
        $stats = Sale::query()
            ->whereIn('status', ['completed', 'partial_refund'])
            ->whereNotNull('customer_id')
            ->selectRaw('customer_id, MAX(completed_at) as last_at, COUNT(*) as frequency, SUM(grand_total) as monetary')
            ->groupBy('customer_id')
            ->get();

        $rows = [];

        foreach ($stats as $stat) {
            $lastAt = $stat->getAttribute('last_at');

            $rows[] = [
                'id' => $stat->customer_id,
                'recency' => is_string($lastAt) ? (float) max(0, now()->diffInDays($lastAt)) : 9999.0,
                'frequency' => (float) $stat->getAttribute('frequency'),
                'monetary' => (float) $stat->getAttribute('monetary'),
            ];
        }

        return $rows;
    }

    /**
     * Ask the ML service for segments. Empty when unavailable.
     *
     * @param  list<array<string, mixed>>  $rows
     * @return list<array{id: int, segment: string}>
     */
    public function segment(array $rows): array
    {
        if ($rows === []) {
            return [];
        }

        try {
            $response = Http::baseUrl((string) config('services.ml.url'))
                ->withHeader('X-ML-Token', (string) config('services.ml.token'))
                ->timeout((int) config('services.ml.timeout', 60))
                ->post('/segment', ['customers' => $rows]);

            if (! $response->successful()) {
                return [];
            }

            $data = $response->json();

            return is_array($data) ? array_values($data) : [];
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * Rebuild stored segments. Returns stored row count.
     */
    public function generate(): int
    {
        $rows = $this->rfmRows();
        $labels = collect($this->segment($rows))->keyBy('id');

        $stored = 0;

        foreach ($rows as $row) {
            $segment = $labels->get($row['id'])['segment'] ?? 'New';

            CustomerSegment::updateOrCreate(
                ['customer_id' => $row['id']],
                [
                    'segment' => $segment,
                    'recency_days' => (int) $row['recency'],
                    'frequency' => (int) $row['frequency'],
                    'monetary' => (int) $row['monetary'],
                ]
            );
            $stored++;
        }

        return $stored;
    }

    /**
     * Counts per segment for reports.
     *
     * @return array<string, int>
     */
    public function counts(): array
    {
        return CustomerSegment::query()
            ->selectRaw('segment, COUNT(*) as count')
            ->groupBy('segment')
            ->pluck('count', 'segment')
            ->map(fn ($count) => (int) $count)
            ->all();
    }
}
