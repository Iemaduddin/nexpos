<?php

namespace App\Http\Controllers;

use App\Http\Requests\Role\StoreRoleRequest;
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

        return Inertia::render('roles/index', [
            'roles' => $roles,
            'permissions' => Permission::query()
                ->where('guard_name', 'web')
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    /**
     * Store a newly created role.
     */
    public function store(StoreRoleRequest $request): RedirectResponse
    {
        Role::create([
            'name' => $request->validated('name'),
            'guard_name' => 'web',
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Peran berhasil ditambahkan.']);

        return to_route('roles.index');
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

        return to_route('roles.index');
    }

    /**
     * Remove a role that has no users attached.
     */
    public function destroy(Role $role): RedirectResponse
    {
        if ($role->users()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Peran tidak dapat dihapus karena masih dipakai pengguna.']);

            return to_route('roles.index');
        }

        $role->users()->detach();
        $role->permissions()->detach();
        $role->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Peran berhasil dihapus.']);

        return to_route('roles.index');
    }
}
