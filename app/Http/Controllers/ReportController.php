<?php

namespace App\Http\Controllers;

use App\Services\ForecastService;
use App\Services\RecommendationService;
use App\Services\ReportService;
use App\Services\SegmentationService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * Show the sales report for a preset period.
     */
    public function index(Request $request, ReportService $reports, ForecastService $forecasts, RecommendationService $recommendations, SegmentationService $segmentation): Response
    {
        $validated = $request->validate([
            'period' => ['nullable', 'string', Rule::in(array_keys(ReportService::PERIODS))],
        ]);

        $period = $validated['period'] ?? 'last_7_days';
        $range = $reports->resolveRange($period);

        return Inertia::render('reports/index', [
            'period' => $period,
            'periods' => ReportService::PERIODS,
            'rangeLabel' => $range['label'],
            'overview' => $reports->overview($range['start'], $range['end']),
            'daily' => $reports->daily($range['start'], $range['end']),
            'categoryRevenue' => $reports->categoryRevenue($range['start'], $range['end']),
            'topProducts' => $reports->topProducts($range['start'], $range['end'], 10),
            'inventoryValue' => $reports->inventoryValue(),
            'forecasts' => $forecasts->digest(8),
            'affinities' => $recommendations->topPairs(6),
            'segments' => $segmentation->counts(),
        ]);
    }

    /**
     * Download the daily breakdown for a period as CSV.
     */
    public function exportCsv(Request $request, ReportService $reports): StreamedResponse
    {
        $validated = $request->validate([
            'period' => ['nullable', 'string', Rule::in(array_keys(ReportService::PERIODS))],
        ]);

        $period = $validated['period'] ?? 'last_7_days';
        $range = $reports->resolveRange($period);
        $rows = $reports->daily($range['start'], $range['end']);

        $filename = sprintf('laporan-harian-%s-%s.csv', $period, now()->format('Ymd'));

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Tanggal', 'Omzet', 'Refund', 'Transaksi', 'Profit']);

            foreach ($rows as $row) {
                fputcsv($out, [
                    $row['date'],
                    $row['revenue'],
                    $row['refunds'],
                    $row['transactions'],
                    $row['profit'],
                ]);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
