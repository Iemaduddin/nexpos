<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\ForecastService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('forecast:generate {--horizon=7 : Days to forecast} {--product= : Product SKU or ID}')]
#[Description('Generate demand forecasts via the ML service')]
class GenerateForecasts extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(ForecastService $forecasts): int
    {
        $horizon = max(1, min(30, (int) $this->option('horizon')));

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

        $saved = $forecasts->generate($only, $horizon);

        if ($saved === 0) {
            $this->warn('Tidak ada proyeksi tersimpan. Pastikan layanan ML berjalan.');

            return self::FAILURE;
        }

        $this->info("Tersimpan {$saved} titik proyeksi.");

        return self::SUCCESS;
    }
}
