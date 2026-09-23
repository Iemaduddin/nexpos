<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('forecast:generate --horizon=7')->weeklyOn(1, '01:00');
Schedule::command('anomalies:scan')->dailyAt('06:00');
Schedule::command('recommend:generate')->weeklyOn(2, '02:00');
Schedule::command('customers:segment')->monthlyOn(1, '03:00');
