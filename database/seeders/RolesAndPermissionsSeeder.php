<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'users.view',
            'users.manage',
            'products.view',
            'products.manage',
            'inventory.view',
            'inventory.purchase',
            'inventory.adjust',
            'sales.view',
            'sales.create',
            'sales.discount',
            'sales.refund',
            'customers.view',
            'customers.manage',
            'suppliers.view',
            'suppliers.manage',
            'reports.view',
            'reports.finance.view',
            'settings.manage',
            'ai.use',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->syncPermissions(Permission::all());

        $manager = Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);
        $manager->syncPermissions([
            'users.view',
            'products.view',
            'products.manage',
            'inventory.view',
            'inventory.purchase',
            'inventory.adjust',
            'sales.view',
            'sales.create',
            'sales.discount',
            'sales.refund',
            'customers.view',
            'customers.manage',
            'suppliers.view',
            'suppliers.manage',
            'reports.view',
            'reports.finance.view',
            'ai.use',
        ]);

        $cashier = Role::firstOrCreate(['name' => 'cashier', 'guard_name' => 'web']);
        $cashier->syncPermissions([
            'products.view',
            'inventory.view',
            'sales.view',
            'sales.create',
            'customers.view',
            'ai.use',
        ]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
