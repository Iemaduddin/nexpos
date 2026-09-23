<?php

use App\Models\BusinessSetting;
use App\Models\CashSession;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    Permission::create(['name' => 'sales.view']);
    Permission::create(['name' => 'sales.create']);
    Permission::create(['name' => 'sales.discount']);
    Permission::create(['name' => 'sales.refund']);
});

function posUser(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

function posMasterData(): array
{
    $suffix = str()->random(6);

    $store = Store::create(['code' => 'T-'.$suffix, 'name' => 'Toko '.$suffix, 'is_main' => true]);
    $product = Product::create([
        'sku' => 'SKU-'.$suffix,
        'name' => 'Kopi '.$suffix,
        'slug' => 'kopi-'.$suffix,
        'category_id' => Category::create(['name' => 'Minuman '.$suffix, 'slug' => 'minuman-'.$suffix])->id,
        'unit_id' => Unit::create(['name' => 'Pcs '.$suffix, 'symbol' => 'pcs-'.$suffix])->id,
        'cost_price' => 20000,
        'selling_price' => 30000,
    ]);
    StockLevel::create([
        'store_id' => $store->id,
        'product_id' => $product->id,
        'qty_on_hand' => 10,
    ]);

    return [
        'store' => $store,
        'product' => $product,
        'customer' => Customer::create(['code' => 'C-'.$suffix, 'name' => 'Pelanggan '.$suffix]),
    ];
}

function openPosSession(Store $store, User $user): void
{
    CashSession::create([
        'store_id' => $store->id,
        'opened_by' => $user->id,
        'opening_balance' => 0,
        'status' => 'open',
        'opened_at' => now(),
    ]);
}

function checkoutPayload(array $master, array $overrides = []): array
{
    return array_merge([
        'customer_id' => $master['customer']->id,
        'discount_total' => 5000,
        'items' => [
            ['product_id' => $master['product']->id, 'qty' => 2, 'unit_price' => 30000, 'discount' => 1000],
        ],
        'payments' => [
            ['method' => 'cash', 'amount' => 100000],
        ],
    ], $overrides);
}

test('guests are redirected to login', function () {
    $this->get(route('pos.index'))->assertRedirect(route('login'));
    $this->get(route('sales.index'))->assertRedirect(route('login'));
});

test('users without permission cannot open the cashier', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('pos.index'))->assertForbidden();
    $this->post(route('pos.checkout'), [])->assertForbidden();
});

test('cashiers can open the pos page', function () {
    $this->actingAs(posUser(['sales.create']));
    Store::create(['code' => 'T-UTAMA', 'name' => 'Toko Utama', 'is_main' => true]);

    $this->get(route('pos.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('pos/index'));
});

test('checkout creates a sale with ledger movements', function () {
    $user = posUser(['sales.create', 'sales.discount']);
    $this->actingAs($user);
    $master = posMasterData();
    $user->update(['store_id' => $master['store']->id]);
    openPosSession($master['store'], $user);

    // 2 x 30000 - 1000 = 59000; - 5000 = 54000; tax 0; paid 100000; change 46000
    $response = $this->post(route('pos.checkout'), checkoutPayload($master));

    $sale = Sale::latest('id')->firstOrFail();
    $response->assertRedirect(route('sales.show', $sale));

    expect($sale->number)->toStartWith('TRX-');
    expect($sale->status)->toBe('completed');
    expect($sale->cashier_id)->toBe($user->id);
    expect($sale->subtotal)->toBe(59000);
    expect($sale->grand_total)->toBe(54000);
    expect($sale->paid_total)->toBe(100000);
    expect($sale->change_amount)->toBe(46000);

    expect($sale->items()->count())->toBe(1);
    $this->assertDatabaseHas('payments', ['sale_id' => $sale->id, 'method' => 'cash', 'amount' => 100000]);

    $level = StockLevel::where('product_id', $master['product']->id)->firstOrFail();
    expect($level->qty_on_hand)->toBe(8.0);

    $movement = StockMovement::where('reference_type', 'sale')->firstOrFail();
    expect($movement->qty_change)->toBe(-2.0);
    expect($movement->qty_before)->toBe(10.0);
    expect($movement->qty_after)->toBe(8.0);

    $master['customer']->refresh();
    expect($master['customer']->transaction_count)->toBe(1);
    expect($master['customer']->total_spent)->toBe(54000);
});

test('checkout applies business tax rate', function () {
    BusinessSetting::create([
        'name' => 'Toko', 'currency' => 'IDR', 'timezone' => 'Asia/Jakarta', 'default_tax_rate' => 10,
    ]);
    $user = posUser(['sales.create', 'sales.discount']);
    $this->actingAs($user);
    $master = posMasterData();
    $user->update(['store_id' => $master['store']->id]);
    openPosSession($master['store'], $user);

    // taxable 54000, tax floor(5400) = 5400, grand 59400
    $this->post(route('pos.checkout'), checkoutPayload($master))
        ->assertRedirect();

    $sale = Sale::latest('id')->firstOrFail();
    expect($sale->tax_total)->toBe(5400);
    expect($sale->grand_total)->toBe(59400);
});

test('checkout applies configured payment rounding', function () {
    BusinessSetting::create([
        'name' => 'Toko',
        'currency' => 'IDR',
        'timezone' => 'Asia/Jakarta',
        'default_tax_rate' => 1,
        'rounding_unit' => 500,
    ]);
    $user = posUser(['sales.create', 'sales.discount']);
    $this->actingAs($user);
    $master = posMasterData();
    $user->update(['store_id' => $master['store']->id]);
    openPosSession($master['store'], $user);

    $this->post(route('pos.checkout'), checkoutPayload($master, [
        'payments' => [['method' => 'cash', 'amount' => 100000]],
    ]))->assertRedirect();

    expect(Sale::latest('id')->firstOrFail()->grand_total)->toBe(55000);
});

test('checkout rejects disabled payment methods', function () {
    BusinessSetting::create([
        'name' => 'Toko',
        'currency' => 'IDR',
        'timezone' => 'Asia/Jakarta',
        'enabled_payment_methods' => ['qris'],
    ]);
    $user = posUser(['sales.create', 'sales.discount']);
    $this->actingAs($user);
    $master = posMasterData();
    $user->update(['store_id' => $master['store']->id]);
    openPosSession($master['store'], $user);

    $this->post(route('pos.checkout'), checkoutPayload($master))
        ->assertSessionHasErrors('payments.0.method');
});

test('checkout rejects insufficient stock and underpayment', function () {
    $user = posUser(['sales.create', 'sales.discount']);
    $this->actingAs($user);
    $master = posMasterData();
    $user->update(['store_id' => $master['store']->id]);
    openPosSession($master['store'], $user);

    $this->post(route('pos.checkout'), checkoutPayload($master, [
        'items' => [['product_id' => $master['product']->id, 'qty' => 99, 'unit_price' => 30000]],
    ]))->assertSessionHasErrors('items.0.qty');

    $this->post(route('pos.checkout'), checkoutPayload($master, [
        'payments' => [['method' => 'cash', 'amount' => 1000]],
    ]))->assertSessionHasErrors('payments');

    expect(Sale::count())->toBe(0);
    expect(StockLevel::firstOrFail()->qty_on_hand)->toBe(10.0);
});

test('a return restores stock and updates sale status', function () {
    $user = posUser(['sales.create', 'sales.refund', 'sales.discount']);
    $this->actingAs($user);
    $master = posMasterData();
    $user->update(['store_id' => $master['store']->id]);
    openPosSession($master['store'], $user);

    $this->post(route('pos.checkout'), checkoutPayload($master));
    $sale = Sale::latest('id')->firstOrFail();
    $item = $sale->items()->firstOrFail();

    $this->get(route('returns.create', $sale))->assertOk();

    $this->post(route('returns.store', $sale), [
        'reason' => 'Cacat',
        'items' => [['sale_item_id' => $item->id, 'qty' => 1]],
    ])->assertRedirect(route('sales.show', $sale));

    // refund: 1 x 30000 - (1000/2) = 29500
    $return = SaleReturn::latest('id')->firstOrFail();
    expect($return->number)->toStartWith('RTN-');
    expect($return->total_refund)->toBe(29500);
    expect($sale->refresh()->status)->toBe('partial_refund');
    expect(StockLevel::firstOrFail()->qty_on_hand)->toBe(9.0);

    $this->post(route('returns.store', $sale), [
        'reason' => 'Sisa',
        'items' => [['sale_item_id' => $item->id, 'qty' => 1]],
    ])->assertRedirect();
    expect($sale->refresh()->status)->toBe('refunded');

    $this->post(route('returns.store', $sale), [
        'reason' => 'Lebih',
        'items' => [['sale_item_id' => $item->id, 'qty' => 1]],
    ])->assertSessionHasErrors();
});

test('checkout supports fractional weighed qty at master price', function () {
    $user = posUser(['sales.create']);
    $this->actingAs($user);
    $master = posMasterData();
    $user->update(['store_id' => $master['store']->id]);
    openPosSession($master['store'], $user);

    // 0.5 kg @ master Rp 30.000 = 15.000, no discount/tax.
    // A sneaky unit_price override must be ignored.
    $response = $this->post(route('pos.checkout'), [
        'items' => [
            ['product_id' => $master['product']->id, 'qty' => 0.5, 'unit_price' => 1],
        ],
        'payments' => [
            ['method' => 'cash', 'amount' => 15000],
        ],
    ]);

    $sale = Sale::latest('id')->firstOrFail();
    $response->assertRedirect(route('sales.show', $sale));

    expect($sale->grand_total)->toBe(15000);
    expect($sale->items()->firstOrFail()->qty)->toBe(0.5);
    expect($sale->items()->firstOrFail()->unit_price)->toBe(30000);
    expect(StockLevel::firstOrFail()->qty_on_hand)->toBe(9.5);
});

test('checkout rejects zero qty', function () {
    $user = posUser(['sales.create']);
    $this->actingAs($user);
    $master = posMasterData();
    $user->update(['store_id' => $master['store']->id]);
    openPosSession($master['store'], $user);

    $this->post(route('pos.checkout'), [
        'items' => [
            ['product_id' => $master['product']->id, 'qty' => 0],
        ],
        'payments' => [
            ['method' => 'cash', 'amount' => 100000],
        ],
    ])->assertSessionHasErrors('items.0.qty');

    expect(Sale::count())->toBe(0);
});

test('only users with discount permission can discount', function () {
    $cashier = posUser(['sales.create']);
    $this->actingAs($cashier);
    $master = posMasterData();
    $cashier->update(['store_id' => $master['store']->id]);
    openPosSession($master['store'], $cashier);

    $this->post(route('pos.checkout'), checkoutPayload($master))
        ->assertSessionHasErrors('discount_total');
    expect(Sale::count())->toBe(0);

    $cashier->givePermissionTo('sales.discount');

    // 2 x 30000 - 1000 - 5000 = 54000.
    $this->post(route('pos.checkout'), checkoutPayload($master))
        ->assertRedirect();
    expect(Sale::latest('id')->firstOrFail()->grand_total)->toBe(54000);
});
