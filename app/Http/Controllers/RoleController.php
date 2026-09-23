<?php

namespace App\Http\Controllers;

use App\Http\Requests\Role\UpdateRoleRequest;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    /**
     * Display the available roles and their permissions.
     */
    public function index(): Response
    {
        $roles = Role::query()
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('roles/index', ['roles' => $roles]);
    }

    /**
     * Show the permission editor for a role.
     */
    public function edit(Role $role): Response
    {
        return Inertia::render('roles/edit', [
            'role' => $role->load('permissions:id,name'),
            'permissions' => Permission::query()
                ->where('guard_name', 'web')
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    /**
     * Synchronize a role's permissions.
     */
    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse
    {
        $permissionIds = $request->validated('permissions');

        $role->syncPermissions(
            Permission::query()->whereKey($permissionIds)->where('guard_name', 'web')->get(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Izin peran berhasil diperbarui.']);

        return to_route('roles.edit', $role);
    }
}
