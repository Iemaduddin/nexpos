<?php

use App\AI\FastPath;
use App\AI\NEXPOSAssistant;
use App\AI\ToolRegistry;
use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    foreach (['ai.use', 'sales.view'] as $name) {
        Permission::create(['name' => $name]);
    }
});

function noHalluUser(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

function noHalluSale(int $grand = 60000): void
{
    $suffix = str()->random(6);
    $store = Store::create(['code' => 'T-'.$suffix, 'name' => 'Toko '.$suffix, 'is_main' => true]);
    $user = User::factory()->create(['store_id' => $store->id]);
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
        'subtotal' => $grand,
        'grand_total' => $grand,
        'paid_total' => $grand,
        'completed_at' => now(),
    ]);
    $sale->items()->create([
        'product_id' => $product->id,
        'qty' => 2,
        'unit_price' => 30000,
        'cost_price' => 20000,
        'subtotal' => $grand,
    ]);
}

test('fast path reply repeats the exact tool numbers', function () {
    noHalluSale(60000);
    $user = noHalluUser(['ai.use', 'sales.view']);

    $tool = app(ToolRegistry::class)->run($user, 'get_sales_summary', ['period' => 'today']);
    $reply = app(FastPath::class)->answer($user, 'Berapa omzet hari ini?');

    expect($reply)->not->toBeNull();
    expect($reply['reply'])->toContain('Rp 60.000');
    expect($reply['reply'])->toContain((string) $tool['transactions']);
});

test('empty data says unavailable instead of inventing sales', function () {
    $user = noHalluUser(['ai.use', 'sales.view']);

    $reply = app(FastPath::class)->answer($user, 'Produk apa yang paling laku hari ini?');

    expect($reply)->not->toBeNull();
    expect($reply['reply'])->toBe('Belum ada produk terjual pada periode tersebut.');
    expect($reply['reply'])->not->toContain('Rp');
});

test('model only ever sees database numbers as tool context', function () {
    noHalluSale(60000);
    $user = noHalluUser(['ai.use', 'sales.view']);

    Http::fake([
        'localhost:11434/*' => Http::sequence()
            ->push([
                'message' => [
                    'role' => 'assistant',
                    'content' => '',
                    'tool_calls' => [
                        ['function' => ['name' => 'get_sales_summary', 'arguments' => ['period' => 'today']]],
                    ],
                ],
            ])
            ->push([
                'message' => ['role' => 'assistant', 'content' => 'Omzet hari ini Rp 60.000 dari 1 transaksi.'],
            ]),
    ]);

    // Bypass FastPath so the model loop runs: analytical keyword forces the full path.
    $result = app(NEXPOSAssistant::class)->chat($user, 'Analisis omzet hari ini, bagaimana trennya?');

    expect($result['reply'])->toContain('Rp 60.000');

    // The second model request must carry the real DB result as tool context.
    Http::assertSent(function ($request) {
        $messages = $request['messages'] ?? [];

        foreach ((array) $messages as $message) {
            if (($message['role'] ?? null) === 'tool' && str_contains((string) ($message['content'] ?? ''), '60000')) {
                return true;
            }
        }

        return false;
    });
});
