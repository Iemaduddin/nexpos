<?php

namespace App\Console\Commands;

use App\Services\SegmentationService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('customers:segment')]
#[Description('Segment customers by RFM via the ML service')]
class SegmentCustomers extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(SegmentationService $segmentation): int
    {
        $stored = $segmentation->generate();

        if ($stored === 0) {
            $this->warn('Tidak ada segmen tersimpan. Pastikan layanan ML berjalan dan ada pelanggan bertransaksi.');

            return self::FAILURE;
        }

        $this->info("Tersimpan {$stored} segmen pelanggan.");

        return self::SUCCESS;
    }
}
