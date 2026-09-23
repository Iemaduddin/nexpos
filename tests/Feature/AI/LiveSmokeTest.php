<?php

use App\AI\NEXPOSAssistant;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use Spatie\Permission\Models\Permission;

test('live smoke against local ollama', function () {
    foreach (['ai.use', 'sales.view'] as $name) {
        Permission::create(['name' => $name]);
    }

    $suffix = str()->random(6);
    $store = Store::create(['code' => 'T-'.$suffix, 'name' => 'Toko '.$suffix, 'is_main' => true]);
    $user = User::factory()->create(['store_id' => $store->id]);
    $user->givePermissionTo(['ai.use', 'sales.view']);

    $product = Product::create([
        'sku' => 'SKU-'.$suffix,
        'name' => 'Kopi '.$suffix,
        'slug' => 'kopi-'.$suffix,
        'category_id' => Category::create(['name' => 'Minuman '.$suffix, 'slug' => 'minuman-'.$suffix])->id,
        'unit_id' => Unit::create(['name' => 'Pcs '.$suffix, 'symbol' => 'pcs-'.$suffix])->id,
        'cost_price' => 20000,
        'selling_price' => 30000,
    ]);

    $sale = Sale::create([
        'number' => 'TRX-'.$suffix,
        'store_id' => $store->id,
        'cashier_id' => $user->id,
        'status' => 'completed',
        'subtotal' => 60000,
        'grand_total' => 60000,
        'paid_total' => 60000,
        'completed_at' => now(),
    ]);
    $sale->items()->create([
        'product_id' => $product->id,
        'qty' => 2,
        'unit_price' => 30000,
        'cost_price' => 20000,
        'subtotal' => 60000,
    ]);

    $result = app(NEXPOSAssistant::class)->chat($user, 'Berapa omzet hari ini?');

    fwrite(STDERR, "\n[LIVE-REPLY] ".$result['reply']."\n");
    expect($result['reply'])->not->toBe('Maaf, layanan AI sedang tidak tersedia. Silakan coba lagi.');
})->skip(fn () => ! env('AI_LIVE_SMOKE', false), 'Set AI_LIVE_SMOKE=1 to run.');
