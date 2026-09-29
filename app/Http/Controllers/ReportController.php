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
            'cogs' => $reports->cogsSummary($range['start'], $range['end']),
            'cogsByProduct' => $reports->cogsByProduct($range['start'], $range['end'], 8),
            'cogsDaily' => $reports->cogsDaily($range['start'], $range['end']),
            'cashFlow' => $reports->cashFlow($range['start'], $range['end']),
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

            if ($out === false) {
                throw new \RuntimeException('Gagal membuka output CSV.');
            }

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

    /**
     * Download net HPP and margin per product as CSV.
     */
    public function exportCogs(Request $request, ReportService $reports): StreamedResponse
    {
        $validated = $request->validate([
            'period' => ['nullable', 'string', Rule::in(array_keys(ReportService::PERIODS))],
        ]);

        $period = $validated['period'] ?? 'last_7_days';
        $range = $reports->resolveRange($period);
        $rows = $reports->cogsByProduct($range['start'], $range['end'], 500);

        $filename = sprintf('laporan-hpp-%s-%s.csv', $period, now()->format('Ymd'));

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');

            if ($out === false) {
                throw new \RuntimeException('Gagal membuka output CSV.');
            }

            fputcsv($out, ['Produk', 'SKU', 'Qty Bersih', 'Pendapatan', 'Refund', 'HPP', 'Marjin']);

            foreach ($rows as $row) {
                fputcsv($out, [
                    $row['name'],
                    $row['sku'],
                    $row['qty'],
                    $row['revenue'],
                    $row['refunds'],
                    $row['cogs'],
                    $row['margin'],
                ]);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Download daily cash flow as CSV with the opening/closing position.
     */
    public function exportCashFlow(Request $request, ReportService $reports): StreamedResponse
    {
        $validated = $request->validate([
            'period' => ['nullable', 'string', Rule::in(array_keys(ReportService::PERIODS))],
        ]);

        $period = $validated['period'] ?? 'last_7_days';
        $range = $reports->resolveRange($period);
        $flow = $reports->cashFlow($range['start'], $range['end']);

        $filename = sprintf('laporan-arus-kas-%s-%s.csv', $period, now()->format('Ymd'));

        return response()->streamDownload(function () use ($flow) {
            $out = fopen('php://output', 'w');

            if ($out === false) {
                throw new \RuntimeException('Gagal membuka output CSV.');
            }

            fputcsv($out, ['Keterangan', 'Jumlah']);
            fputcsv($out, ['Saldo awal', $flow['opening_balance']]);
            fputcsv($out, ['Kas masuk penjualan', $flow['cash_in']]);
            fputcsv($out, ['Bayar pemasok', $flow['cash_out_purchases']]);
            fputcsv($out, ['Refund pelanggan', $flow['cash_out_refunds']]);
            fputcsv($out, ['Arus bersih', $flow['net_flow']]);
            fputcsv($out, ['Saldo akhir', $flow['closing_balance']]);
            fputcsv($out, []);
            fputcsv($out, ['Tanggal', 'Masuk', 'Keluar', 'Bersih']);

            foreach ($flow['daily'] as $row) {
                fputcsv($out, [$row['date'], $row['in'], $row['out'], $row['net']]);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
