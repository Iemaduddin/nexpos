<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class HealthController extends Controller
{
    /**
     * Liveness probe: database, pending jobs, and ML reachability.
     *
     * Public by design (load balancers / uptime monitors), but returns
     * only booleans and counts — never business data or secrets.
     */
    public function __invoke(Request $request): JsonResponse
    {
        try {
            DB::select('select 1');

            $database = true;
        } catch (\Throwable) {
            $database = false;
        }

        try {
            $pendingJobs = DB::table('jobs')->count();
        } catch (\Throwable) {
            $pendingJobs = null;
        }

        $ml = $this->mlReachable();

        $ok = $database && $ml !== false;

        return response()->json([
            'ok' => $ok,
            'database' => $database,
            'pending_jobs' => $pendingJobs,
            'ml' => $ml,
        ], $ok ? 200 : 503);
    }

    /**
     * True when reachable, false on failure, null when unconfigured.
     */
    private function mlReachable(): ?bool
    {
        $url = (string) config('services.ml.url', '');

        if ($url === '') {
            return null;
        }

        try {
            $response = Http::baseUrl($url)->timeout(3)->connectTimeout(2)->get('/health');

            return $response->successful();
        } catch (\Throwable) {
            return false;
        }
    }
}
