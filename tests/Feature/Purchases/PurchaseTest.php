<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    Permission::create(['name' => 'inventory.view']);
    Permission::create(['name' => 'inventory.purchase']);
});

function purchaseUser(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

function purchaseMasterData(): array
{
    $suffix = str()->random(6);

    return [
        'supplier' => Supplier::create(['code' => 'SUP-'.$suffix, 'name' => 'Supplier '.$suffix]),
        'store' => Store::create(['code' => 'T-'.$suffix, 'name' => 'Toko '.$suffix]),
        'product' => Product::create([
            'sku' => 'SKU-'.$suffix,
            'name' => 'Kopi '.$suffix,
            'slug' => 'kopi-'.$suffix,
            'category_id' => Category::create(['name' => 'Minuman '.$suffix, 'slug' => 'minuman-'.$suffix])->id,
            'unit_id' => Unit::create(['name' => 'Pcs '.$suffix, 'symbol' => 'pcs-'.$suffix])->id,
            'cost_price' => 20000,
            'selling_price' => 30000,
        ]),
    ];
}

function draftPurchase(array $overrides = []): Purchase
{
    $master = purchaseMasterData();

    $purchase = Purchase::create([
        'number' => 'PO-TEST-'.str()->random(6),
        'supplier_id' => $master['supplier']->id,
        'store_id' => $master['store']->id,
        'status' => 'draft',
        'subtotal' => 100000,
        'grand_total' => 100000,
    ]);

    $purchase->items()->create([
        'product_id' => $master['product']->id,
        'qty_ordered' => 5,
        'cost_price' => 20000,
        'subtotal' => 100000,
    ]);

    return $purchase->refresh();
}

test('guests are redirected to login', function () {
    $this->get(route('purchases.index'))->assertRedirect(route('login'));
});

test('users without permission cannot view purchases', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('purchases.index'))->assertForbidden();
});

test('users with view permission cannot visit the index', function () {
    $this->actingAs(purchaseUser(['inventory.view']));

    $this->get(route('purchases.index'))->assertForbidden();
});

test('users with purchase permission can visit the index', function () {
    $this->actingAs(purchaseUser(['inventory.purchase']));

    $this->get(route('purchases.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('purchases/index'));
});

test('users with purchase permission can store a draft with backend totals', function () {
    $this->actingAs(purchaseUser(['inventory.view', 'inventory.purchase']));
    $master = purchaseMasterData();

    $response = $this->post(route('purchases.store'), [
        'supplier_id' => $master['supplier']->id,
        'store_id' => $master['store']->id,
        'discount' => 5000,
        'tax' => 10000,
        'items' => [
            ['product_id' => $master['product']->id, 'qty_ordered' => 5, 'cost_price' => 20000],
        ],
    ]);

    $response->assertRedirect(route('purchases.index'));

    $purchase = Purchase::latest('id')->firstOrFail();
    expect($purchase->number)->toStartWith('PO-');
    expect($purchase->subtotal)->toBe(100000);
    expect($purchase->grand_total)->toBe(105000);
    expect($purchase->status)->toBe('draft');
});

test('variant is required for products that have variants', function () {
    $this->actingAs(purchaseUser(['inventory.purchase']));
    $master = purchaseMasterData();
    $master['product']->variants()->create([
        'name' => '250 gram', 'sku' => 'V-'.str()->random(6),
        'cost_price' => 20000, 'selling_price' => 30000,
    ]);

    $this->post(route('purchases.store'), [
        'supplier_id' => $master['supplier']->id,
        'store_id' => $master['store']->id,
        'items' => [
            ['product_id' => $master['product']->id, 'qty_ordered' => 2, 'cost_price' => 20000],
        ],
    ])->assertSessionHasErrors('items.0.variant_id');
});

test('only drafts can be edited or ordered twice', function () {
    $this->actingAs(purchaseUser(['inventory.purchase']));
    $purchase = draftPurchase();

    $this->patch(route('purchases.order', $purchase))->assertRedirect();
    expect($purchase->refresh()->status)->toBe('ordered');

    $this->get(route('purchases.edit', $purchase))->assertRedirect();
    $this->patch(route('purchases.order', $purchase))->assertRedirect();
    expect($purchase->refresh()->status)->toBe('ordered');
});

test('receiving posts stock ledger and updates status', function () {
    $this->actingAs(purchaseUser(['inventory.purchase']));
    $purchase = draftPurchase();
    $purchase->update(['status' => 'ordered']);
    $item = $purchase->items()->firstOrFail();

    $this->post(route('purchases.receive', $purchase), [
        'items' => [['id' => $item->id, 'qty' => 2]],
    ])->assertRedirect();

    expect($item->refresh()->qty_received)->toBe(2.0);
    expect($purchase->refresh()->status)->toBe('partial');

    $level = StockLevel::where('product_id', $item->product_id)->firstOrFail();
    expect($level->qty_on_hand)->toBe(2.0);

    $movement = StockMovement::where('reference_type', 'purchase')->firstOrFail();
    expect($movement->type)->toBe('purchase');
    expect($movement->qty_change)->toBe(2.0);
    expect($movement->qty_before)->toBe(0.0);
    expect($movement->qty_after)->toBe(2.0);

    $this->post(route('purchases.receive', $purchase), [
        'items' => [['id' => $item->id, 'qty' => 3]],
    ])->assertRedirect();

    expect($purchase->refresh()->status)->toBe('received');
    expect($purchase->refresh()->received_at)->not->toBeNull();
});

test('over-receiving and receiving a draft are rejected', function () {
    $this->actingAs(purchaseUser(['inventory.purchase']));
    $purchase = draftPurchase();
    $item = $purchase->items()->firstOrFail();

    $this->post(route('purchases.receive', $purchase), [
        'items' => [['id' => $item->id, 'qty' => 1]],
    ])->assertSessionHasErrors('status');

    $purchase->update(['status' => 'ordered']);

    $this->post(route('purchases.receive', $purchase), [
        'items' => [['id' => $item->id, 'qty' => 99]],
    ])->assertSessionHasErrors('items.0.qty');
});

test('payments move status from unpaid to paid and reject overpay', function () {
    $this->actingAs(purchaseUser(['inventory.purchase']));
    $purchase = draftPurchase();

    $this->post(route('purchases.payments', $purchase), ['amount' => 40000])
        ->assertRedirect();
    expect($purchase->refresh()->payment_status)->toBe('partial');

    $this->post(route('purchases.payments', $purchase), ['amount' => 999999])
        ->assertSessionHasErrors('amount');

    $this->post(route('purchases.payments', $purchase), ['amount' => 60000])
        ->assertRedirect();
    $purchase = $purchase->refresh();
    expect($purchase->paid_amount)->toBe(100000);
    expect($purchase->payment_status)->toBe('paid');
});

test('cancel is blocked after receiving but works before', function () {
    $this->actingAs(purchaseUser(['inventory.purchase']));
    $purchase = draftPurchase();
    $purchase->update(['status' => 'ordered']);
    $item = $purchase->items()->firstOrFail();

    $this->patch(route('purchases.cancel', $purchase))->assertRedirect();
    expect($purchase->refresh()->status)->toBe('cancelled');

    $purchase->update(['status' => 'ordered']);
    $item->update(['qty_received' => 2]);

    $this->patch(route('purchases.cancel', $purchase))->assertRedirect();
    expect($purchase->refresh()->status)->toBe('ordered');
});

test('only untouched drafts can be deleted', function () {
    $this->actingAs(purchaseUser(['inventory.purchase']));
    $purchase = draftPurchase();

    $this->delete(route('purchases.destroy', $purchase))->assertRedirect(route('purchases.index'));
    $this->assertDatabaseMissing('purchases', ['id' => $purchase->id]);

    $ordered = draftPurchase();
    $ordered->update(['status' => 'ordered']);

    $this->delete(route('purchases.destroy', $ordered))->assertRedirect();
    $this->assertDatabaseHas('purchases', ['id' => $ordered->id]);
});
