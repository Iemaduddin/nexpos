<?php

namespace App\Services;

use App\Models\Forecast;
use App\Models\Product;
use App\Models\SaleItem;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;

/**
 * Demand forecasting orchestration.
 *
 * Laravel builds the historical series and stores results.
 * The math itself runs in the Python ML service.
 */
class ForecastService
{
    public const HISTORY_DAYS = 90;

    public function __construct(private readonly ReportService $reports) {}

    /**
     * Daily sold quantities for the past N days, oldest first, zeros filled.
     *
     * @return list<float>
     */
    public function seriesFor(Product $product, int $days = self::HISTORY_DAYS): array
    {
        $tz = $this->reports->timezone();
        $end = now()->setTimezone($tz)->startOfDay();
        $start = $end->copy()->subDays($days - 1);

        $byDay = SaleItem::query()
            ->where('sale_items.product_id', $product->id)
            ->whereHas('sale', fn ($query) => $query
                ->whereIn('status', ['completed', 'partial_refund'])
                ->whereBetween('completed_at', [
                    $start->copy()->setTimezone('UTC'),
                    $end->copy()->endOfDay()->setTimezone('UTC'),
                ]))
            ->with('sale:id,completed_at')
            ->get(['sale_id', 'qty'])
            ->groupBy(fn ($item) => $item->sale->completed_at->setTimezone($tz)->toDateString())
            ->map->sum('qty');

        $series = [];
        for ($day = $start->copy(); $day->lte($end); $day = $day->copy()->addDay()) {
            $series[] = (float) ($byDay->get($day->toDateString(), 0));
        }

        return $series;
    }

    /**
     * Ask the ML service for a forecast. Null when unavailable.
     *
     * @param  list<float>  $values
     * @return array<string, mixed>|null
     */
    public function predict(array $values, int $horizon): ?array
    {
        try {
            $response = Http::baseUrl((string) config('services.ml.url'))
                ->withHeader('X-ML-Token', (string) config('services.ml.token'))
                ->timeout((int) config('services.ml.timeout', 60))
                ->post('/forecast', ['values' => $values, 'horizon' => $horizon]);

            if (! $response->successful()) {
                return null;
            }

            $data = $response->json();

            if (! is_array($data) || ! isset($data['quantities']) || ! is_array($data['quantities'])) {
                return null;
            }

            return $data;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Generate and store forecasts for products. Returns saved row count.
     */
    public function generate(?Product $only = null, int $horizon = 7): int
    {
        $products = $only
            ? collect([$only])
            : Product::query()->where('is_active', true)->where('track_inventory', true)->get();

        $saved = 0;

        foreach ($products as $product) {
            $result = $this->predict($this->seriesFor($product), $horizon);

            if ($result === null) {
                continue;
            }

            Forecast::query()
                ->where('product_id', $product->id)
                ->where('horizon_days', $horizon)
                ->where('target_date', '>=', today()->toDateString())
                ->delete();

            $dates = $result['quantities'];

            foreach (array_values($dates) as $i => $qty) {
                Forecast::create([
                    'product_id' => $product->id,
                    'store_id' => null,
                    'target_date' => today()->addDays($i + 1)->toDateString(),
                    'horizon_days' => $horizon,
                    'predicted_qty' => $qty,
                    'lower_qty' => $result['lower'][$i] ?? 0,
                    'upper_qty' => $result['upper'][$i] ?? 0,
                    'model' => $result['model'] ?? 'unknown',
                    'confidence' => $result['confidence'] ?? 'low',
                ]);
                $saved++;
            }
        }

        return $saved;
    }

    /**
     * Latest per-product weekly projection digest for reports.
     *
     * @return list<array<string, mixed>>
     */
    public function digest(int $limit = 8): array
    {
        $rows = Forecast::query()
            ->selectRaw('product_id, SUM(predicted_qty) as qty, MIN(target_date) as from_date, MAX(target_date) as to_date, MAX(confidence) as confidence, MAX(model) as model')
            ->with('product:id,name,sku')
            ->where('target_date', '>=', today()->toDateString())
            ->groupBy('product_id')
            ->orderByDesc('qty')
            ->limit($limit)
            ->get();

        $digest = [];

        foreach ($rows as $row) {
            $digest[] = [
                'product' => $row->product->name,
                'sku' => $row->product->sku,
                'qty' => round((float) $row->getAttribute('qty'), 1),
                'from' => $row->getAttribute('from_date'),
                'to' => $row->getAttribute('to_date'),
                'confidence' => $row->getAttribute('confidence'),
            ];
        }

        return $digest;
    }

    /**
     * Stored forecast points for one product, if any.
     *
     * @return Collection<int, Forecast>
     */
    public function forProduct(Product $product, int $horizon = 7): Collection
    {
        return Forecast::query()
            ->where('product_id', $product->id)
            ->where('horizon_days', $horizon)
            ->where('target_date', '>=', today()->toDateString())
            ->orderBy('target_date')
            ->get();
    }
}
