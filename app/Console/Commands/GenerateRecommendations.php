<?php

namespace App\Console\Commands;

use App\Jobs\GenerateRecommendationsJob;
use App\Models\MlRun;
use App\Services\RecommendationService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('recommend:generate {--queue : Dispatch to the ml queue instead of running inline}')]
#[Description('Rebuild product affinity pairs via the ML service')]
class GenerateRecommendations extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(RecommendationService $recommendations): int
    {
        if ($this->option('queue')) {
            GenerateRecommendationsJob::dispatch();
            $this->info('Recommendation dimasukkan ke antrean ml.');

            return self::SUCCESS;
        }

        $stored = MlRun::track('recommend', fn () => $recommendations->generate());

        if ($stored === 0) {
            $this->warn('Tidak ada pasangan tersimpan. Pastikan layanan ML berjalan dan ada transaksi multi-item.');

            return self::FAILURE;
        }

        $this->info("Tersimpan {$stored} pasangan produk.");

        return self::SUCCESS;
    }
}
