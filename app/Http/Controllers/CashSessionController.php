<?php

namespace App\Http\Controllers;

use App\Http\Requests\CashSession\CloseCashSessionRequest;
use App\Http\Requests\CashSession\StoreCashSessionRequest;
use App\Models\CashSession;
use App\Models\Store;
use App\Services\CashSessionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class CashSessionController extends Controller
{
    /**
     * Display open sessions and history.
     */
    public function index(Request $request, CashSessionService $sessions): Response
    {
        Gate::authorize('viewAny', CashSession::class);

        $open = CashSession::query()
            ->with(['store:id,name', 'opener:id,name'])
            ->where('status', 'open')
            ->orderByDesc('opened_at')
            ->get()
            ->map(fn ($session) => array_merge($session->toArray(), [
                'expected' => $sessions->expectedFor($session),
            ]));

        $sessions = CashSession::query()
            ->with(['store:id,name', 'opener:id,name', 'closer:id,name'])
            ->where('status', 'closed')
            ->orderByDesc('id')
            ->paginate(10);

        $store = $request->user()->store
            ?? Store::query()->where('is_main', true)->first();

        return Inertia::render('sessions/index', [
            'openSessions' => $open,
            'sessions' => $sessions,
            'userStore' => $store?->only(['id', 'name']),
        ]);
    }

    /**
     * Open a new cash session for the cashier's store.
     */
    public function store(StoreCashSessionRequest $request): RedirectResponse
    {
        $store = $request->user()->store
            ?? Store::query()->where('is_main', true)->firstOrFail();

        if (CashSession::query()->where('store_id', $store->id)->where('status', 'open')->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => "Toko {$store->name} sudah memiliki sesi kas yang terbuka."]);

            return to_route('sessions.index');
        }

        CashSession::create([
            'store_id' => $store->id,
            'opened_by' => $request->user()->id,
            'opening_balance' => $request->validated()['opening_balance'],
            'status' => 'open',
            'opened_at' => now(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Sesi kas dibuka. Selamat berjualan.']);

        return to_route('pos.index');
    }

    /**
     * Reconciliation detail: drawer math, methods, and refunds.
     */
    public function show(CashSession $session, CashSessionService $sessions): Response
    {
        Gate::authorize('view', $session);

        $session->load(['store:id,name', 'opener:id,name', 'closer:id,name']);

        return Inertia::render('sessions/show', [
            'session' => $session,
            'breakdown' => $sessions->breakdown($session),
        ]);
    }

    /**
     * Close an open session with actual cash count.
     */
    public function close(CloseCashSessionRequest $request, CashSession $session, CashSessionService $sessions): RedirectResponse
    {
        if ($session->status !== 'open') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Sesi ini sudah ditutup.']);

            return to_route('sessions.index');
        }

        // Route-model binding uses {session}; authorize ran in the request.
        $closed = $sessions->close($request->user(), $session, (int) $request->validated()['closing_actual']);

        $difference = (int) $closed->difference;

        Inertia::flash('toast', $difference === 0
            ? ['type' => 'success', 'message' => 'Sesi kas ditutup. Selisih nol, laci cocok.']
            : ['type' => 'warning', 'message' => 'Sesi kas ditutup dengan selisih '.$this->rupiah($difference).'.']);

        return to_route('sessions.show', $closed);
    }

    private function rupiah(int $value): string
    {
        return 'Rp '.number_format($value, 0, ',', '.');
    }
}
