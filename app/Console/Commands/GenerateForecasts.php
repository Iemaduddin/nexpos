<?php

namespace App\Console\Commands;

use App\Jobs\GenerateForecastsJob;
use App\Models\MlRun;
use App\Models\Product;
use App\Services\ForecastService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('forecast:generate {--horizon=7 : Days to forecast} {--product= : Product SKU or ID} {--queue : Dispatch to the ml queue instead of running inline}')]
#[Description('Generate demand forecasts via the ML service')]
class GenerateForecasts extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(ForecastService $forecasts): int
    {
        $horizon = max(1, min(30, (int) $this->option('horizon')));

        if ($this->option('queue')) {
            $productId = null;
            if ($this->option('product')) {
                $productId = Product::query()
                    ->where('id', $this->option('product'))
                    ->orWhere('sku', $this->option('product'))
                    ->value('id');
            }
            GenerateForecastsJob::dispatch($horizon, $productId ? (int) $productId : null);
            $this->info('Forecast dimasukkan ke antrean ml.');

            return self::SUCCESS;
        }

        $only = null;
        if ($this->option('product')) {
            $only = Product::query()
                ->where('id', $this->option('product'))
                ->orWhere('sku', $this->option('product'))
                ->first();

            if (! $only) {
                $this->error('Produk tidak ditemukan.');

                return self::FAILURE;
            }
        }

        $saved = MlRun::track('forecast', fn () => $forecasts->generate($only, $horizon));

        if ($saved === 0) {
            $this->warn('Tidak ada proyeksi tersimpan. Pastikan layanan ML berjalan.');

            return self::FAILURE;
        }

        $this->info("Tersimpan {$saved} titik proyeksi.");

        return self::SUCCESS;
    }
}
