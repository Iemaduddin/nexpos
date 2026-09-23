<?php

namespace App\Console\Commands;

use App\Services\AnomalyService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('anomalies:scan')]
#[Description('Scan the last 30 days for sales anomalies via the ML service')]
class ScanAnomalies extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(AnomalyService $anomalies): int
    {
        $stored = $anomalies->scan();

        $this->info("Ditemukan {$stored} anomali baru.");

        return self::SUCCESS;
    }
}
