<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Unit;
use Illuminate\Database\Seeder;

/**
 * Demo master data: generic grocery products, customers, suppliers.
 *
 * Idempotent: safe to run multiple times (firstOrCreate by unique keys).
 */
class MasterDataSeeder extends Seeder
{
    /**
     * @var list<array{name: string, sku: string, category: string, unit: string, cost: int, price: int, threshold: int, variants?: list<array{name: string, sku: string, cost: int, price: int}>}>
     */
    private const PRODUCTS = [
        ['name' => 'Kopi Arabica 250g', 'sku' => 'KPA-250', 'category' => 'minuman', 'unit' => 'pcs', 'cost' => 32000, 'price' => 45000, 'threshold' => 10, 'variants' => [
            ['name' => '500 gram', 'sku' => 'KPA-500', 'cost' => 62000, 'price' => 88000],
        ]],
        ['name' => 'Kopi Sachet Classic', 'sku' => 'KPS-001', 'category' => 'minuman', 'unit' => 'pcs', 'cost' => 1000, 'price' => 1500, 'threshold' => 50],
        ['name' => 'Teh Celup 25s', 'sku' => 'TEH-025', 'category' => 'minuman', 'unit' => 'box', 'cost' => 8500, 'price' => 12000, 'threshold' => 15],
        ['name' => 'Susu UHT Full Cream 1L', 'sku' => 'SSU-1000', 'category' => 'minuman', 'unit' => 'pcs', 'cost' => 15500, 'price' => 19500, 'threshold' => 12],
        ['name' => 'Air Mineral 600ml', 'sku' => 'AMN-600', 'category' => 'minuman', 'unit' => 'pcs', 'cost' => 2500, 'price' => 3500, 'threshold' => 48, 'variants' => [
            ['name' => 'Dus isi 24', 'sku' => 'AMN-DUS', 'cost' => 54000, 'price' => 72000],
        ]],
        ['name' => 'Gula Pasir 1kg', 'sku' => 'GUL-1000', 'category' => 'makanan', 'unit' => 'pcs', 'cost' => 15500, 'price' => 18500, 'threshold' => 20],
        ['name' => 'Mie Instan Goreng', 'sku' => 'MIE-001', 'category' => 'makanan', 'unit' => 'pcs', 'cost' => 2800, 'price' => 3500, 'threshold' => 60, 'variants' => [
            ['name' => 'Pack isi 5', 'sku' => 'MIE-P05', 'cost' => 13500, 'price' => 16500],
        ]],
        ['name' => 'Beras Premium 5kg', 'sku' => 'BRS-5000', 'category' => 'makanan', 'unit' => 'pcs', 'cost' => 56000, 'price' => 62500, 'threshold' => 8],
        ['name' => 'Telur Ayam 1kg', 'sku' => 'TLR-1000', 'category' => 'makanan', 'unit' => 'kg', 'cost' => 24000, 'price' => 28000, 'threshold' => 10],
        ['name' => 'Minyak Goreng 2L', 'sku' => 'MYK-2000', 'category' => 'makanan', 'unit' => 'pcs', 'cost' => 36000, 'price' => 42000, 'threshold' => 10],
        ['name' => 'Roti Tawar', 'sku' => 'RTI-001', 'category' => 'makanan', 'unit' => 'pcs', 'cost' => 12000, 'price' => 16000, 'threshold' => 12],
        ['name' => 'Kecap Manis 550ml', 'sku' => 'KCP-550', 'category' => 'makanan', 'unit' => 'pcs', 'cost' => 17000, 'price' => 22000, 'threshold' => 10],
        ['name' => 'Saos Sambal 340ml', 'sku' => 'SAO-340', 'category' => 'makanan', 'unit' => 'pcs', 'cost' => 14000, 'price' => 18000, 'threshold' => 10],
        ['name' => 'Sabun Mandi Batang', 'sku' => 'SBN-001', 'category' => 'kebutuhan-rumah', 'unit' => 'pcs', 'cost' => 4000, 'price' => 5500, 'threshold' => 30],
        ['name' => 'Shampo 170ml', 'sku' => 'SHP-170', 'category' => 'kebutuhan-rumah', 'unit' => 'pcs', 'cost' => 19000, 'price' => 24000, 'threshold' => 12],
        ['name' => 'Deterjen Bubuk 800g', 'sku' => 'DTJ-800', 'category' => 'kebutuhan-rumah', 'unit' => 'pcs', 'cost' => 17000, 'price' => 22000, 'threshold' => 12],
    ];

    /**
     * @var list<array{name: string, phone: string}>
     */
    private const CUSTOMERS = [
        ['name' => 'Budi Santoso', 'phone' => '081201000001'],
        ['name' => 'Siti Aminah', 'phone' => '081201000002'],
        ['name' => 'Andi Wijaya', 'phone' => '081201000003'],
        ['name' => 'Dewi Lestari', 'phone' => '081201000004'],
        ['name' => 'Agus Setiawan', 'phone' => '081201000005'],
        ['name' => 'Rina Marlina', 'phone' => '081201000006'],
        ['name' => 'Joko Prasetyo', 'phone' => '081201000007'],
        ['name' => 'Maya Putri', 'phone' => '081201000008'],
        ['name' => 'Hendra Gunawan', 'phone' => '081201000009'],
        ['name' => 'Lina Hartati', 'phone' => '081201000010'],
        ['name' => 'Dedi Kurniawan', 'phone' => '081201000011'],
        ['name' => 'Fitri Handayani', 'phone' => '081201000012'],
    ];

    /**
     * @var list<array{code: string, name: string, contact: string, phone: string}>
     */
    private const SUPPLIERS = [
        ['code' => 'SUP-MJU', 'name' => 'Distributor Maju Jaya', 'contact' => 'Pak Andi', 'phone' => '0215500001'],
        ['code' => 'SUP-BKH', 'name' => 'Grosir Berkah', 'contact' => 'Bu Sari', 'phone' => '0215500002'],
        ['code' => 'SUP-SRJ', 'name' => 'Supplier Sumber Rejeki', 'contact' => 'Pak Budi', 'phone' => '0215500003'],
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $brand = Brand::where('slug', 'umum')->firstOrFail();

        foreach (self::PRODUCTS as $item) {
            $category = Category::where('slug', $item['category'])->firstOrFail();
            $unit = Unit::where('symbol', $item['unit'])->firstOrFail();

            $product = Product::firstOrCreate(
                ['sku' => $item['sku']],
                [
                    'name' => $item['name'],
                    'slug' => str($item['name'])->slug()->toString(),
                    'category_id' => $category->id,
                    'brand_id' => $brand->id,
                    'unit_id' => $unit->id,
                    'cost_price' => $item['cost'],
                    'selling_price' => $item['price'],
                    'low_stock_threshold' => $item['threshold'],
                    'is_active' => true,
                ]
            );

            foreach ($item['variants'] ?? [] as $variant) {
                $product->variants()->firstOrCreate(
                    ['sku' => $variant['sku']],
                    [
                        'name' => $variant['name'],
                        'cost_price' => $variant['cost'],
                        'selling_price' => $variant['price'],
                        'low_stock_threshold' => $item['threshold'],
                        'is_active' => true,
                    ]
                );
            }
        }

        foreach (self::CUSTOMERS as $i => $item) {
            Customer::firstOrCreate(
                ['phone' => $item['phone']],
                [
                    'code' => sprintf('C-0000-%04d', $i + 1),
                    'name' => $item['name'],
                    'is_active' => true,
                ]
            );
        }

        foreach (self::SUPPLIERS as $item) {
            Supplier::firstOrCreate(
                ['code' => $item['code']],
                [
                    'name' => $item['name'],
                    'contact_person' => $item['contact'],
                    'phone' => $item['phone'],
                    'is_active' => true,
                ]
            );
        }
    }
}
