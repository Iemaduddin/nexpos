<?php

namespace App\Http\Controllers;

use App\Http\Requests\CashSession\CloseCashSessionRequest;
use App\Http\Requests\CashSession\StoreCashSessionRequest;
use App\Models\CashSession;
use App\Models\Payment;
use App\Models\SaleReturn;
use App\Models\Store;
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
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', CashSession::class);

        $open = CashSession::query()
            ->with(['store:id,name', 'opener:id,name'])
            ->where('status', 'open')
            ->orderByDesc('opened_at')
            ->get()
            ->map(fn ($session) => array_merge($session->toArray(), [
                'expected' => $this->expectedFor($session),
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
     * Show the form for opening a new session.
     */
    public function create(Request $request): Response
    {
        Gate::authorize('create', CashSession::class);

        $store = $request->user()->store
            ?? Store::query()->where('is_main', true)->firstOrFail();

        return Inertia::render('sessions/create', [
            'store' => $store->only(['id', 'name']),
            'alreadyOpen' => CashSession::query()
                ->where('store_id', $store->id)
                ->where('status', 'open')
                ->exists(),
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
     * Close an open session with actual cash count.
     */
    public function close(CloseCashSessionRequest $request, CashSession $session): RedirectResponse
    {
        if ($session->status !== 'open') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Sesi ini sudah ditutup.']);

            return to_route('sessions.index');
        }

        // Route-model binding uses {session}; authorize ran in the request.
        $expected = $this->expectedFor($session);
        $actual = $request->validated()['closing_actual'];

        $session->update([
            'closed_by' => $request->user()->id,
            'closing_expected' => $expected,
            'closing_actual' => $actual,
            'difference' => $actual - $expected,
            'status' => 'closed',
            'closed_at' => now(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Sesi kas ditutup.']);

        return to_route('sessions.index');
    }

    /**
     * Expected cash in drawer: opening + cash sales - refunds.
     */
    private function expectedFor(CashSession $session): int
    {
        $cashIn = Payment::query()
            ->where('method', 'cash')
            ->whereHas('sale', fn ($query) => $query->where('cash_session_id', $session->id))
            ->sum('amount');

        $refunds = SaleReturn::query()
            ->whereHas('sale', fn ($query) => $query->where('cash_session_id', $session->id))
            ->sum('total_refund');

        return (int) $session->opening_balance + (int) $cashIn - (int) $refunds;
    }
}
