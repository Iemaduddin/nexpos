<?php

namespace Database\Seeders;

use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $store = Store::where('code', 'TOKO-UTAMA')->first();

        $users = [
            ['name' => 'Administrator', 'email' => 'admin@example.com', 'role' => 'admin'],
            ['name' => 'Manager Toko', 'email' => 'manager@example.com', 'role' => 'manager'],
            ['name' => 'Kasir Toko', 'email' => 'kasir@example.com', 'role' => 'cashier'],
        ];

        foreach ($users as $item) {
            $user = User::firstOrCreate(
                ['email' => $item['email']],
                [
                    'name' => $item['name'],
                    'password' => 'password',
                    'store_id' => $store?->id,
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]
            );

            if (! $user->hasRole($item['role'])) {
                $user->assignRole($item['role']);
            }
        }
    }
}
