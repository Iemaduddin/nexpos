<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    Permission::create(['name' => 'inventory.view']);
    Permission::create(['name' => 'inventory.adjust']);
});

function adjustmentUser(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

function adjustmentMasterData(): array
{
    $suffix = str()->random(6);

    return [
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

function draftAdjustment(): StockAdjustment
{
    $master = adjustmentMasterData();

    $adjustment = StockAdjustment::create([
        'number' => 'ADJ-TEST-'.str()->random(6),
        'store_id' => $master['store']->id,
        'type' => 'correction',
        'status' => 'draft',
    ]);

    $adjustment->items()->create([
        'product_id' => $master['product']->id,
        'qty_system' => 0,
        'qty_actual' => 8,
        'qty_diff' => 0,
    ]);

    return $adjustment->refresh();
}

test('guests are redirected to login', function () {
    $this->get(route('adjustments.index'))->assertRedirect(route('login'));
});

test('users without permission cannot view adjustments', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('adjustments.index'))->assertForbidden();
});

test('users with view permission can visit the index', function () {
    $this->actingAs(adjustmentUser(['inventory.view']));

    $this->get(route('adjustments.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('adjustments/index'));
});

test('users with adjust permission can store a draft', function () {
    $this->actingAs(adjustmentUser(['inventory.view', 'inventory.adjust']));
    $master = adjustmentMasterData();

    $response = $this->post(route('adjustments.store'), [
        'store_id' => $master['store']->id,
        'type' => 'correction',
        'reason' => 'Opname mingguan',
        'items' => [
            ['product_id' => $master['product']->id, 'qty_actual' => 8],
        ],
    ]);

    $response->assertRedirect(route('adjustments.index'));

    $adjustment = StockAdjustment::latest('id')->firstOrFail();
    expect($adjustment->number)->toStartWith('ADJ-');
    expect($adjustment->status)->toBe('draft');
    expect($adjustment->items()->count())->toBe(1);
});

test('type must be valid and items required', function () {
    $this->actingAs(adjustmentUser(['inventory.adjust']));
    $master = adjustmentMasterData();

    $this->post(route('adjustments.store'), [
        'store_id' => $master['store']->id,
        'type' => 'ngawur',
        'items' => [],
    ])->assertSessionHasErrors(['type', 'items']);
});

test('approving books the difference to the ledger', function () {
    $user = adjustmentUser(['inventory.adjust']);
    $this->actingAs($user);
    $adjustment = draftAdjustment();
    $item = $adjustment->items()->firstOrFail();

    StockLevel::create([
        'store_id' => $adjustment->store_id,
        'product_id' => $item->product_id,
        'qty_on_hand' => 10,
    ]);

    $this->patch(route('adjustments.approve', $adjustment))->assertRedirect();

    $adjustment = $adjustment->refresh();
    expect($adjustment->status)->toBe('approved');
    expect($adjustment->approved_by)->toBe($user->id);
    expect($adjustment->approved_at)->not->toBeNull();

    expect($item->refresh()->qty_system)->toBe(10.0);
    expect($item->refresh()->qty_diff)->toBe(-2.0);

    $level = StockLevel::where('product_id', $item->product_id)->firstOrFail();
    expect($level->qty_on_hand)->toBe(8.0);

    $movement = StockMovement::where('reference_type', 'stock_adjustment')->firstOrFail();
    expect($movement->type)->toBe('adjustment');
    expect($movement->qty_change)->toBe(-2.0);
    expect($movement->qty_before)->toBe(10.0);
    expect($movement->qty_after)->toBe(8.0);
});

test('approving twice and editing after approval are blocked', function () {
    $this->actingAs(adjustmentUser(['inventory.adjust']));
    $adjustment = draftAdjustment();

    $this->patch(route('adjustments.approve', $adjustment))->assertRedirect();
    expect($adjustment->refresh()->status)->toBe('approved');

    $this->patch(route('adjustments.approve', $adjustment))->assertRedirect();
    $this->get(route('adjustments.edit', $adjustment))->assertRedirect();

    $master = adjustmentMasterData();
    $this->put(route('adjustments.update', $adjustment), [
        'store_id' => $master['store']->id,
        'type' => 'lost',
        'items' => [['product_id' => $master['product']->id, 'qty_actual' => 1]],
    ])->assertRedirect();
    expect($adjustment->refresh()->type)->toBe('correction');
});

test('only drafts can be deleted', function () {
    $this->actingAs(adjustmentUser(['inventory.adjust']));
    $adjustment = draftAdjustment();

    $this->delete(route('adjustments.destroy', $adjustment))
        ->assertRedirect(route('adjustments.index'));
    $this->assertDatabaseMissing('stock_adjustments', ['id' => $adjustment->id]);

    $approved = draftAdjustment();
    $approved->update(['status' => 'approved']);

    $this->delete(route('adjustments.destroy', $approved))->assertRedirect();
    $this->assertDatabaseHas('stock_adjustments', ['id' => $approved->id]);
});
