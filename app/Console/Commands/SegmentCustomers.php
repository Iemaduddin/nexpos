<?php

namespace App\Console\Commands;

use App\Jobs\SegmentCustomersJob;
use App\Models\MlRun;
use App\Services\SegmentationService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('customers:segment {--queue : Dispatch to the ml queue instead of running inline}')]
#[Description('Segment customers by RFM via the ML service')]
class SegmentCustomers extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(SegmentationService $segmentation): int
    {
        if ($this->option('queue')) {
            SegmentCustomersJob::dispatch();
            $this->info('Segmentasi dimasukkan ke antrean ml.');

            return self::SUCCESS;
        }

        $stored = MlRun::track('segment', fn () => $segmentation->generate());

        if ($stored === 0) {
            $this->warn('Tidak ada segmen tersimpan. Pastikan layanan ML berjalan dan ada pelanggan bertransaksi.');

            return self::FAILURE;
        }

        $this->info("Tersimpan {$stored} segmen pelanggan.");

        return self::SUCCESS;
    }
}
