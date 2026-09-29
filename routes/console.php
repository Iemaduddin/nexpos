<?php

use App\Jobs\GenerateBriefingJob;
use App\Jobs\GenerateForecastsJob;
use App\Jobs\GenerateRecommendationsJob;
use App\Jobs\ScanAnomaliesJob;
use App\Jobs\SegmentCustomersJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::job(new GenerateForecastsJob)->weeklyOn(1, '01:00');
Schedule::job(new ScanAnomaliesJob)->dailyAt('06:00');
Schedule::job(new GenerateRecommendationsJob)->weeklyOn(2, '02:00');
Schedule::job(new SegmentCustomersJob)->monthlyOn(1, '03:00');
Schedule::job(new GenerateBriefingJob)->dailyAt('05:30');
