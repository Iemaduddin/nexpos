<?php

namespace App\Jobs;

use App\AI\DailyBriefing;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class GenerateBriefingJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public int $tries = 2;

    /** @var array<int, int> */
    public array $backoff = [60, 300];

    public function __construct(public readonly ?string $date = null)
    {
        $this->onQueue('ai');
    }

    public function handle(DailyBriefing $briefing): void
    {
        // Warms the daily cache so dashboards/AI read instantly.
        // Falls back to deterministic text when Ollama is unavailable.
        $briefing->generate();
    }
}
