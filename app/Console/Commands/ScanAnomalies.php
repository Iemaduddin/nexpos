<?php

namespace App\Console\Commands;

use App\Jobs\ScanAnomaliesJob;
use App\Models\MlRun;
use App\Services\AnomalyService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('anomalies:scan {--queue : Dispatch to the ml queue instead of running inline}')]
#[Description('Scan the last 30 days for sales anomalies via the ML service')]
class ScanAnomalies extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(AnomalyService $anomalies): int
    {
        if ($this->option('queue')) {
            ScanAnomaliesJob::dispatch();
            $this->info('Anomaly scan dimasukkan ke antrean ml.');

            return self::SUCCESS;
        }

        $stored = MlRun::track('anomaly', fn () => $anomalies->scan());

        $this->info("Ditemukan {$stored} anomali baru.");

        return self::SUCCESS;
    }
}
