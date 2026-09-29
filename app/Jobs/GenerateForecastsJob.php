<?php

namespace App\Jobs;

use App\Models\MlRun;
use App\Models\Product;
use App\Services\ForecastService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class GenerateForecastsJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 600;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(
        public readonly int $horizon = 7,
        public readonly ?int $productId = null,
    ) {
        $this->onQueue('ml');
    }

    public function handle(ForecastService $forecasts): void
    {
        $only = $this->productId
            ? Product::query()->find($this->productId)
            : null;

        MlRun::track('forecast', fn () => $forecasts->generate($only, $this->horizon));
    }
}
