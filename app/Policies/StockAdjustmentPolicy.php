<?php

namespace App\Policies;

use App\Models\StockAdjustment;
use App\Models\User;

class StockAdjustmentPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('inventory.adjust');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, StockAdjustment $adjustment): bool
    {
        return $user->can('inventory.adjust');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('inventory.adjust');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, StockAdjustment $adjustment): bool
    {
        return $user->can('inventory.adjust');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, StockAdjustment $adjustment): bool
    {
        return $user->can('inventory.adjust');
    }

    /**
     * Determine whether the user can approve the model.
     */
    public function approve(User $user, StockAdjustment $adjustment): bool
    {
        return $user->can('inventory.adjust');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, StockAdjustment $adjustment): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, StockAdjustment $adjustment): bool
    {
        return false;
    }
}
