<?php

namespace App\Policies;

use App\Models\BusinessSetting;
use App\Models\User;

class BusinessSettingPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('settings.manage');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, BusinessSetting $setting): bool
    {
        return $user->can('settings.manage');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, BusinessSetting $setting): bool
    {
        return $user->can('settings.manage');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, BusinessSetting $setting): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, BusinessSetting $setting): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, BusinessSetting $setting): bool
    {
        return false;
    }
}
