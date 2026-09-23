<?php

use App\AI\AiException;
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
    foreach (['ai.use', 'sales.view', 'inventory.view'] as $name) {
        Permission::create(['name' => $name]);
    }
});

function aiUser(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

function aiSale(): Sale
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

    return $sale;
}

test('registry only runs registered tools with valid authorized calls', function () {
    $registry = app(ToolRegistry::class);
    $user = aiUser(['sales.view']);

    expect($registry->has('get_sales_summary'))->toBeTrue();
    expect($registry->has('get_top_products'))->toBeTrue();
    expect($registry->has('get_low_stock_products'))->toBeTrue();
    expect($registry->has('drop_database'))->toBeFalse();

    $this->expectException(AiException::class);
    $registry->run($user, 'drop_database', []);
});

test('unknown tool and bad arguments raise errors', function () {
    $registry = app(ToolRegistry::class);
    $user = aiUser(['sales.view']);

    try {
        $registry->run($user, 'get_sales_summary', ['period' => 'kapan']);
        $this->fail('Expected AiException for invalid period.');
    } catch (AiException $e) {
        expect($e->getMessage())->toBe('Parameter tool tidak valid.');
    }

    try {
        $registry->run($user, 'get_sales_summary', []);
        $this->fail('Expected AiException for missing period.');
    } catch (AiException $e) {
        expect($e->getMessage())->toBe('Parameter tool tidak valid.');
    }
});

test('unauthorized users cannot run tools', function () {
    $registry = app(ToolRegistry::class);
    $user = aiUser(['ai.use']);

    try {
        $registry->run($user, 'get_sales_summary', ['period' => 'today']);
        $this->fail('Expected AiException for unauthorized tool call.');
    } catch (AiException $e) {
        expect($e->getMessage())->toBe('Anda tidak memiliki izin untuk mengakses data ini.');
    }
});

test('get_sales_summary returns real numbers', function () {
    aiSale();
    $registry = app(ToolRegistry::class);
    $user = aiUser(['sales.view']);

    $result = $registry->run($user, 'get_sales_summary', ['period' => 'today']);

    expect($result['period'])->toBe('today');
    expect($result['revenue'])->toBe(60000);
    expect($result['transactions'])->toBe(1);
    expect($result['profit'])->toBe(20000);
});

test('assistant executes tool calls and returns the final answer', function () {
    aiSale();
    $user = aiUser(['ai.use', 'sales.view']);

    Http::fake([
        'localhost:11434/*' => Http::sequence()
            ->push([
                'message' => [
                    'role' => 'assistant',
                    'content' => '',
                    'tool_calls' => [
                        ['function' => ['name' => 'get_top_products', 'arguments' => ['period' => 'today', 'limit' => 5]]],
                    ],
                ],
            ])
            ->push([
                'message' => ['role' => 'assistant', 'content' => 'Produk paling laku hari ini adalah kopi dengan 2 unit terjual.'],
            ]),
    ]);

    $result = app(NEXPOSAssistant::class)->chat($user, 'Bagaimana penjualan hari ini?');

    expect($result['reply'])->toContain('kopi');
    Http::assertSentCount(2);
});

test('assistant falls back gracefully when ollama is down', function () {
    $user = aiUser(['ai.use']);

    Http::fake(['localhost:11434/*' => Http::response('boom', 500)]);

    $result = app(NEXPOSAssistant::class)->chat($user, 'Berapa omzet hari ini?');

    expect($result['reply'])->toBe('Maaf, layanan AI sedang tidak tersedia. Silakan coba lagi.');
});

test('chat endpoint requires permission and validates input', function () {
    $this->actingAs(aiUser(['sales.view']));
    $this->postJson(route('ai.chat'), ['message' => 'Halo'])->assertForbidden();

    $this->actingAs(aiUser(['ai.use', 'sales.view']));
    $this->postJson(route('ai.chat'), ['message' => ''])->assertJsonValidationErrors('message');

    Http::fake([
        'localhost:11434/*' => Http::response([
            'message' => ['role' => 'assistant', 'content' => 'Halo juga.'],
        ]),
    ]);

    $this->postJson(route('ai.chat'), ['message' => 'Halo'])
        ->assertOk()
        ->assertJson(['reply' => 'Halo juga.']);
});

test('ai index page requires ai.use permission', function () {
    $this->actingAs(aiUser(['sales.view']));
    $this->get(route('ai.index'))->assertForbidden();

    $this->actingAs(aiUser(['ai.use']));
    $this->get(route('ai.index'))->assertOk();
});

test('tool definitions are ollama-compatible', function () {
    $definitions = app(ToolRegistry::class)->definitions();

    expect($definitions)->not->toBeEmpty();

    $json = json_encode($definitions);

    // Ollama 400s on empty required arrays and [] properties.
    expect($json)->not->toContain('"required":[]');
    expect($json)->not->toContain('"properties":[]');

    foreach ($definitions as $definition) {
        expect($definition['type'])->toBe('function');
        expect($definition['function']['parameters']['type'])->toBe('object');
    }
});

test('simple questions use the fast model, analytical ones use the full model', function () {
    $assistant = app(NEXPOSAssistant::class);

    expect($assistant->selectModel('Berapa omzet hari ini?'))->toBe('qwen3:4b');
    expect($assistant->selectModel('Stok apa yang menipis?'))->toBe('qwen3:4b');
    expect($assistant->selectModel('Kenapa omzet minggu ini turun?'))->toBe('qwen3:8b');
    expect($assistant->selectModel('Strategi apa untuk menaikkan penjualan?'))->toBe('qwen3:8b');
});

test('chat sends the selected model to ollama', function () {
    $user = aiUser(['ai.use']);

    Http::fake([
        'localhost:11434/*' => Http::response([
            'message' => ['role' => 'assistant', 'content' => 'Halo juga.'],
        ]),
    ]);

    app(NEXPOSAssistant::class)->chat($user, 'Halo');

    Http::assertSent(fn ($request) => $request->data()['model'] === 'qwen3:4b');
});

test('missing full model falls back to the fast model', function () {
    $user = aiUser(['ai.use']);

    Http::fake([
        'localhost:11434/*' => Http::sequence()
            ->push(['error' => "model 'qwen3:8b' not found"], 404)
            ->push(['message' => ['role' => 'assistant', 'content' => 'Analisis cepat.']]),
    ]);

    $result = app(NEXPOSAssistant::class)->chat($user, 'Jelaskan penjualan');

    expect($result['reply'])->toBe('Analisis cepat.');
    Http::assertSentCount(2);
});

test('fast path answers common questions without the model', function () {
    aiSale();
    $user = aiUser(['ai.use', 'sales.view', 'inventory.view']);

    Http::fake();

    expect(app(NEXPOSAssistant::class)->chat($user, 'Berapa omzet hari ini?'))
        ->toBe(['reply' => 'Omzet hari ini: Rp 60.000 dari 1 transaksi.']);

    expect(app(NEXPOSAssistant::class)->chat($user, 'Produk apa yang paling laku?')['reply'])
        ->toContain('paling laku hari ini');

    expect(app(NEXPOSAssistant::class)->chat($user, 'Stok apa yang menipis?')['reply'])
        ->toStartWith('Stok menipis:');

    Http::assertNothingSent();
});

test('fast path skips analytical and unauthorized questions', function () {
    aiSale();

    // Analytical → falls through to the model.
    // Unauthorized → falls through (model reports unavailability).
    Http::fake([
        'localhost:11434/*' => Http::sequence()
            ->push(['message' => ['role' => 'assistant', 'content' => 'Analisis.']])
            ->push(['message' => ['role' => 'assistant', 'content' => 'Tidak ada izin.']]),
    ]);

    $result = app(NEXPOSAssistant::class)->chat(
        aiUser(['ai.use', 'sales.view']), 'Kenapa omzet turun?'
    );
    expect($result['reply'])->toBe('Analisis.');

    $result = app(NEXPOSAssistant::class)->chat(aiUser(['ai.use']), 'Berapa omzet hari ini?');
    expect($result['reply'])->toBe('Tidak ada izin.');
});
