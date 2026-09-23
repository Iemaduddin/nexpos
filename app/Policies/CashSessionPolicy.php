<?php

namespace App\Policies;

use App\Models\CashSession;
use App\Models\User;

class CashSessionPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('sales.view');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, CashSession $session): bool
    {
        return $user->can('sales.view');
    }

    /**
     * Determine whether the user can open a session.
     */
    public function create(User $user): bool
    {
        return $user->can('sales.create');
    }

    /**
     * Determine whether the user can close the session.
     */
    public function close(User $user, CashSession $session): bool
    {
        return $user->can('sales.create')
            && ($session->opened_by === $user->id || $user->can('users.manage'));
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, CashSession $session): bool
    {
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, CashSession $session): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, CashSession $session): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, CashSession $session): bool
    {
        return false;
    }
}
