<?php

namespace App\Policies;

use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\User;

class SaleReturnPolicy
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
    public function view(User $user, SaleReturn $return): bool
    {
        return $user->can('sales.view');
    }

    /**
     * Determine whether the user can create a return for the given sale.
     */
    public function create(User $user, ?Sale $sale = null): bool
    {
        return $user->can('sales.refund');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, SaleReturn $return): bool
    {
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, SaleReturn $return): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, SaleReturn $return): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, SaleReturn $return): bool
    {
        return false;
    }
}
