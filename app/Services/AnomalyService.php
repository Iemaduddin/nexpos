<?php

namespace App\Services;

use App\Models\AnomalyDetection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;

/**
 * Anomaly detection orchestration.
 *
 * Laravel builds the daily series and stores findings.
 * The statistics run in the Python ML service.
 */
class AnomalyService
{
    public const SERIES_DAYS = 30;

    public function __construct(private readonly ReportService $reports) {}

    /**
     * Ask the ML service for findings. Empty when unavailable.
     *
     * @param  list<array{date: string, revenue: int, transactions: int}>  $points
     * @return list<array<string, mixed>>
     */
    public function detect(array $points): array
    {
        try {
            $response = Http::baseUrl((string) config('services.ml.url'))
                ->withHeader('X-ML-Token', (string) config('services.ml.token'))
                ->timeout((int) config('services.ml.timeout', 60))
                ->post('/anomalies', ['points' => $points]);

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
     * Scan the last 30 days and store new findings. Returns new count.
     */
    public function scan(): int
    {
        $range = $this->reports->resolveRange('last_30_days');
        $daily = $this->reports->daily($range['start'], $range['end']);

        $findings = $this->detect(array_map(fn ($row) => [
            'date' => $row['date'],
            'revenue' => $row['revenue'],
            'transactions' => $row['transactions'],
        ], $daily));

        $stored = 0;

        foreach ($findings as $finding) {
            $date = $finding['date'] ?? null;
            $type = $finding['type'] ?? 'unknown';

            $exists = AnomalyDetection::query()
                ->whereDate('date', (string) $date)
                ->where('type', (string) $type)
                ->exists();

            if ($exists) {
                continue;
            }

            AnomalyDetection::create([
                'date' => $date,
                'type' => $type,
                'severity' => $finding['severity'] ?? 'medium',
                'score' => $finding['score'] ?? 0,
                'detail' => ['note' => $finding['note'] ?? null],
                'status' => 'new',
            ]);
            $stored++;
        }

        return $stored;
    }

    /**
     * Latest unreviewed findings.
     *
     * @return Collection<int, AnomalyDetection>
     */
    public function recent(int $limit = 5): Collection
    {
        return AnomalyDetection::query()
            ->where('status', 'new')
            ->orderByDesc('date')
            ->orderByDesc('score')
            ->limit($limit)
            ->get();
    }
}
