<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Store;
use App\Models\Unit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class BaseDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        BusinessSetting::firstOrCreate(
            ['id' => 1],
            [
                'name' => 'NEXPOS Demo',
                'address' => 'Jl. Contoh No. 1, Jakarta',
                'phone' => '081234567890',
                'email' => 'info@example.com',
                'currency' => 'IDR',
                'timezone' => 'Asia/Jakarta',
                'default_tax_rate' => 0,
                'receipt_header' => 'Terima kasih telah berbelanja',
                'receipt_footer' => 'Barang yang sudah dibeli tidak dapat dikembalikan',
            ]
        );

        Store::firstOrCreate(
            ['code' => 'TOKO-UTAMA'],
            [
                'name' => 'Toko Utama',
                'address' => 'Jl. Contoh No. 1, Jakarta',
                'phone' => '081234567890',
                'is_main' => true,
                'is_active' => true,
            ]
        );

        foreach (['pcs', 'pack', 'box', 'kg', 'g', 'l', 'ml'] as $symbol) {
            Unit::firstOrCreate(
                ['symbol' => $symbol],
                ['name' => $symbol, 'is_active' => true]
            );
        }

        foreach (['Minuman', 'Makanan', 'Snack', 'Kebutuhan Rumah', 'Lainnya'] as $name) {
            Category::firstOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'is_active' => true]
            );
        }

        Brand::firstOrCreate(
            ['slug' => 'umum'],
            ['name' => 'Umum', 'is_active' => true]
        );
    }
}
