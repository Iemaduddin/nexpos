<?php

namespace App\Services;

use App\Concerns\Auditable;
use App\Models\CashSession;
use App\Models\Payment;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Cash drawer reconciliation extracted from CashSessionController.
 *
 * Expected cash = opening + cash sales − cash refunds in the session.
 * Non-cash payments are reported for information but never enter
 * the drawer expectation.
 */
class CashSessionService
{
    use Auditable;

    /**
     * Expected cash in the drawer right now (or at closing time).
     */
    public function expectedFor(CashSession $session): int
    {
        $cashIn = (int) Payment::query()
            ->where('method', 'cash')
            ->whereHas('sale', fn ($query) => $query->where('cash_session_id', $session->id))
            ->sum('amount');

        $refunds = (int) SaleReturn::query()
            ->whereHas('sale', fn ($query) => $query->where('cash_session_id', $session->id))
            ->sum('total_refund');

        return (int) $session->opening_balance + $cashIn - $refunds;
    }

    /**
     * Full reconciliation breakdown for the session detail page.
     *
     * @return array<string, mixed>
     */
    public function breakdown(CashSession $session): array
    {
        $saleIds = Sale::query()
            ->where('cash_session_id', $session->id)
            ->pluck('id');

        $byMethod = $saleIds->isEmpty() ? collect() : Payment::query()
            ->whereIn('sale_id', $saleIds)
            ->selectRaw('method, SUM(amount) as amount, COUNT(*) as payments')
            ->groupBy('method')
            ->get();

        $methods = [];

        foreach ($byMethod as $row) {
            $methods[] = [
                'method' => $row->method,
                'amount' => (int) $row->getAttribute('amount'),
                'payments' => (int) $row->getAttribute('payments'),
            ];
        }

        $cashSales = 0;

        foreach ($methods as $method) {
            if ($method['method'] === 'cash') {
                $cashSales = $method['amount'];
            }
        }

        $returns = SaleReturn::query()
            ->whereHas('sale', fn ($query) => $query->where('cash_session_id', $session->id))
            ->get(['id', 'number', 'total_refund', 'created_at']);

        $refunds = (int) $returns->sum('total_refund');
        $expected = (int) $session->opening_balance + $cashSales - $refunds;

        return [
            'opening_balance' => (int) $session->opening_balance,
            'sales_count' => $saleIds->count(),
            'by_method' => $methods,
            'cash_sales' => $cashSales,
            'returns_count' => $returns->count(),
            'refunds' => $refunds,
            'returns' => $returns->map(fn ($ret) => [
                'id' => $ret->id,
                'number' => $ret->number,
                'total_refund' => (int) $ret->total_refund,
                'created_at' => $ret->created_at?->toDateTimeString(),
            ])->all(),
            'expected' => $session->status === 'closed' ? (int) $session->closing_expected : $expected,
            'actual' => $session->closing_actual === null ? null : (int) $session->closing_actual,
            'difference' => $session->closing_actual === null
                ? null
                : (int) $session->closing_actual - (int) $session->closing_expected,
        ];
    }

    public function close(User $user, CashSession $session, int $actual): CashSession
    {
        if ($session->status !== 'open') {
            throw ValidationException::withMessages([
                'session' => 'Sesi ini sudah ditutup.',
            ]);
        }

        $expected = $this->expectedFor($session);

        $session->update([
            'closed_by' => $user->id,
            'closing_expected' => $expected,
            'closing_actual' => $actual,
            'difference' => $actual - $expected,
            'status' => 'closed',
            'closed_at' => now(),
        ]);

        self::audit('session.close', $session, [], [
            'expected' => $expected,
            'actual' => $actual,
            'difference' => $actual - $expected,
        ]);

        return $session;
    }
}
