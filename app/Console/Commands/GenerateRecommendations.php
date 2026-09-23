<?php

namespace App\Console\Commands;

use App\Services\RecommendationService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('recommend:generate')]
#[Description('Rebuild product affinity pairs via the ML service')]
class GenerateRecommendations extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(RecommendationService $recommendations): int
    {
        $stored = $recommendations->generate();

        if ($stored === 0) {
            $this->warn('Tidak ada pasangan tersimpan. Pastikan layanan ML berjalan dan ada transaksi multi-item.');

            return self::FAILURE;
        }

        $this->info("Tersimpan {$stored} pasangan produk.");

        return self::SUCCESS;
    }
}
