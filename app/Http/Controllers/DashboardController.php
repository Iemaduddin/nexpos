<?php

namespace App\Http\Controllers;

use App\AI\DailyBriefing;
use App\Services\AnomalyService;
use App\Services\ReportService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Show today's business overview.
     */
    public function index(ReportService $reports, DailyBriefing $briefing, AnomalyService $anomalies): Response
    {
        $today = $reports->resolveRange('today');
        $week = $reports->resolveRange('last_7_days');

        return Inertia::render('dashboard', [
            'overview' => $reports->overview($today['start'], $today['end']),
            'hourlySales' => $reports->hourlySales($today['start'], $today['end']),
            'paymentSummary' => $reports->paymentSummary($today['start'], $today['end']),
            'topProducts' => $reports->topProducts($week['start'], $week['end'], 5),
            'lowStock' => $reports->lowStock(5),
            'recentSales' => $reports->recentSales(5),
            'briefing' => $briefing->cached(),
            'anomalies' => $anomalies->recent(3),
        ]);
    }
}
