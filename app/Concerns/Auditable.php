<?php

namespace App\Concerns;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

/**
 * Attach to models that need audit history (sale, purchase,
 * stock adjustment, sale return, document verification).
 */
trait Auditable
{
    /**
     * @param  array<string, mixed>  $oldValues
     * @param  array<string, mixed>  $newValues
     */
    public static function audit(
        string $action,
        ?object $auditable = null,
        array $oldValues = [],
        array $newValues = [],
    ): void {
        try {
            AuditLog::create([
                'user_id' => Auth::id(),
                'action' => $action,
                'auditable_type' => $auditable ? $auditable::class : null,
                'auditable_id' => $auditable && isset($auditable->id) ? $auditable->id : null,
                'old_values' => $oldValues === [] ? null : $oldValues,
                'new_values' => $newValues === [] ? null : $newValues,
                'ip' => request()->ip(),
                'user_agent' => substr((string) request()->userAgent(), 0, 500),
            ]);
        } catch (\Throwable) {
            // Audit must never break the business transaction.
        }
    }
}
