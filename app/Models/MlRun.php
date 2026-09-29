<?php

namespace App\Models;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Throwable;

/**
 * Observability for scheduled ML workloads.
 *
 * Every forecast/anomaly/recommend/segment execution — queued or inline —
 * leaves one row: when it ran, how long it took, how many rows it stored,
 * and the error when the ML service was unreachable.
 */
class MlRun extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'kind',
        'status',
        'started_at',
        'finished_at',
        'duration_ms',
        'result_count',
        'error',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    /**
     * Run $fn and record timing, row count, and errors.
     *
     * @template T
     *
     * @param  Closure(): T  $fn
     * @return T
     */
    public static function track(string $kind, Closure $fn): mixed
    {
        $run = self::create(['kind' => $kind, 'status' => 'running']);
        $start = (int) (microtime(true) * 1000);

        try {
            $result = $fn();
        } catch (Throwable $e) {
            $run->update([
                'status' => 'failed',
                'finished_at' => now(),
                'duration_ms' => (int) (microtime(true) * 1000) - $start,
                'error' => substr($e->getMessage(), 0, 1000),
            ]);

            throw $e;
        }

        $run->update([
            'status' => 'success',
            'finished_at' => now(),
            'duration_ms' => (int) (microtime(true) * 1000) - $start,
            'result_count' => is_int($result) ? $result : null,
        ]);

        return $result;
    }
}
