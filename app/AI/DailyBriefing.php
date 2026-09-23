<?php

namespace App\AI;

use App\Services\ReportService;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Morning business briefing from real metrics.
 *
 * The numbers are deterministic; the model only narrates them.
 * The result is cached per day so dashboards stay fast.
 */
class DailyBriefing
{
    public function __construct(
        private readonly ReportService $reports,
        private readonly OllamaClient $client,
    ) {}

    public static function cacheKey(?string $date = null): string
    {
        return 'ai.briefing.'.($date ?? today()->toDateString());
    }

    public function cached(): ?string
    {
        $value = Cache::get(self::cacheKey());

        return is_string($value) ? $value : null;
    }

    /**
     * @return array{briefing: string, cached: bool}
     */
    public function generate(): array
    {
        $key = self::cacheKey();

        if (is_string($cached = Cache::get($key))) {
            return ['briefing' => $cached, 'cached' => true];
        }

        $metrics = $this->metrics();
        $briefing = $this->narrate($metrics) ?? $this->fallback($metrics);

        Cache::put($key, $briefing, now()->endOfDay());

        return ['briefing' => $briefing, 'cached' => false];
    }

    /**
     * @return array<string, mixed>
     */
    public function metrics(): array
    {
        $yesterday = $this->reports->resolveRange('yesterday');
        [$weekStart, $weekEnd] = $this->weekRange();

        return [
            'date' => $yesterday['start']->toDateString(),
            'overview' => $this->reports->overview($yesterday['start'], $yesterday['end']),
            'comparison' => $this->reports->comparison('yesterday'),
            'top_products' => $this->reports->topProducts($weekStart, $weekEnd, 5),
            'low_stock' => $this->reports->lowStock(5),
            'inventory' => $this->reports->inventorySummary(),
        ];
    }

    /**
     * @return array{0: CarbonInterface, 1: CarbonInterface}
     */
    private function weekRange(): array
    {
        $range = $this->reports->resolveRange('last_7_days');

        return [$range['start'], $range['end']];
    }

    /**
     * @param  array<string, mixed>  $metrics
     */
    private function narrate(array $metrics): ?string
    {
        try {
            $message = $this->client->chat([
                [
                    'role' => 'system',
                    'content' => 'Kamu asisten bisnis toko di Indonesia. Tulis briefing pagi dalam teks biasa tanpa format markdown, maksimal 10 baris: omzet dan transaksi kemarin vs hari sebelumnya, produk terlaris, stok yang perlu perhatian, dan satu saran singkat. Gunakan HANYA angka dari data. Jangan tambah angka lain.',
                ],
                [
                    'role' => 'user',
                    'content' => 'Data kemarin: '.json_encode($metrics, JSON_UNESCAPED_UNICODE),
                ],
            ]);

            $content = trim((string) ($message['content'] ?? ''));

            return $content !== '' ? $content : null;
        } catch (Throwable $e) {
            Log::warning('Briefing AI gagal, memakai teks otomatis.', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Deterministic text fallback built only from real numbers.
     *
     * @param  array<string, mixed>  $metrics
     */
    private function fallback(array $metrics): string
    {
        $overview = $metrics['overview'];
        $lines = [
            'Briefing bisnis pagi ini.',
            "Omzet kemarin {$this->rupiah($overview['revenue'])} dari {$overview['transactions']} transaksi.",
            "Laba kotor kemarin {$this->rupiah($overview['profit'])}.",
        ];

        $top = $metrics['top_products'][0] ?? null;
        $lines[] = $top
            ? "Produk terlaris minggu ini: {$top['name']} ({$top['qty']} terjual)."
            : 'Belum ada produk terjual minggu ini.';

        $low = $metrics['low_stock'];
        $parts = [];

        if (is_array($low)) {
            foreach ($low as $product) {
                if (is_array($product)) {
                    $parts[] = "{$product['name']} (sisa {$product['stock']})";
                }
            }
        }

        $lines[] = $parts !== []
            ? 'Stok menipis: '.implode(', ', $parts).'.'
            : 'Semua stok dalam batas aman.';

        return implode("\n", $lines);
    }

    private function rupiah(int $value): string
    {
        return 'Rp '.number_format($value, 0, ',', '.');
    }
}
