<?php

namespace App\Jobs;

use App\Models\MlRun;
use App\Services\AnomalyService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ScanAnomaliesJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct()
    {
        $this->onQueue('ml');
    }

    public function handle(AnomalyService $anomalies): void
    {
        MlRun::track('anomaly', fn () => $anomalies->scan());
    }
}
