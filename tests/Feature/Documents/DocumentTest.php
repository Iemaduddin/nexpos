<?php

use App\Models\Category;
use App\Models\Document;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    Permission::create(['name' => 'inventory.view']);
    Permission::create(['name' => 'inventory.purchase']);
    Storage::fake('local');
});

function documentUser(array $permissions): User
{
    $user = User::factory()->create();
    $user->givePermissionTo($permissions);

    return $user;
}

function fakeOcr(): void
{
    Http::fake([
        '127.0.0.1:8001/*' => Http::response([
            'supplier_name' => 'Distributor Maju',
            'number' => 'INV-99',
            'date' => '2026-09-20',
            'total' => 150000,
            'items' => [
                ['name' => 'Kopi Arabica', 'qty' => 2, 'price' => 30000],
            ],
            'raw_text' => "DISTRIBUTOR MAJU\nTotal: Rp 150.000",
            'avg_confidence' => 0.98,
        ]),
    ]);
}

function uploadedDocument($test): Document
{
    $user = documentUser(['inventory.view', 'inventory.purchase']);

    $response = $test->actingAs($user)->post(route('documents.store'), [
        'file' => UploadedFile::fake()->image('faktur.jpg'),
    ]);

    $response->assertRedirect();

    return Document::latest('id')->firstOrFail();
}

test('guests are redirected to login', function () {
    $this->get(route('documents.index'))->assertRedirect(route('login'));
});

test('users without permission cannot view documents', function () {
    $this->actingAs(User::factory()->create());

    $this->get(route('documents.index'))->assertForbidden();
});

test('upload extracts and stores the document', function () {
    fakeOcr();
    $document = uploadedDocument($this);

    expect($document->status)->toBe('processed');
    expect($document->extracted_data['total'])->toBe(150000);
    expect($document->extracted_data['items'])->toHaveCount(1);
    expect($document->ocr_text)->toContain('DISTRIBUTOR');
    Storage::disk('local')->assertExists($document->file_path);
});

test('upload marks failed when ml is down', function () {
    Http::fake(['127.0.0.1:8001/*' => Http::response('boom', 500)]);
    $this->actingAs(documentUser(['inventory.purchase']));

    $this->post(route('documents.store'), [
        'file' => UploadedFile::fake()->image('faktur.jpg'),
    ])->assertRedirect();

    expect(Document::latest('id')->firstOrFail()->status)->toBe('failed');
});

test('non-image uploads are rejected', function () {
    $this->actingAs(documentUser(['inventory.purchase']));

    $this->post(route('documents.store'), [
        'file' => UploadedFile::fake()->create('nota.pdf', 100, 'application/pdf'),
    ])->assertSessionHasErrors('file');
});

test('index, show and private file need purchase permission', function () {
    fakeOcr();
    $document = uploadedDocument($this);

    $this->actingAs(documentUser(['inventory.view']));
    $this->get(route('documents.index'))->assertForbidden();
    $this->get(route('documents.show', $document))->assertForbidden();
    $this->get(route('documents.file', $document))->assertForbidden();

    $this->actingAs(documentUser(['inventory.purchase']));
    $this->get(route('documents.index'))->assertOk();
    $this->get(route('documents.show', $document))->assertOk();
    $this->get(route('documents.file', $document))->assertOk();

    $this->actingAs(User::factory()->create());
    $this->get(route('documents.index'))->assertForbidden();
    $this->get(route('documents.show', $document))->assertForbidden();
    $this->get(route('documents.file', $document))->assertForbidden();
});

test('verify page prefills from extraction', function () {
    fakeOcr();
    $document = uploadedDocument($this);
    $this->actingAs(documentUser(['inventory.purchase']));

    $this->get(route('documents.verify', $document))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('documents/verify')
            ->has('initialItems', 1));
});

test('confirm creates a draft purchase and links the document', function () {
    fakeOcr();
    $document = uploadedDocument($this);

    $suffix = str()->random(6);
    $store = Store::create(['code' => 'T-'.$suffix, 'name' => 'Toko '.$suffix, 'is_main' => true]);
    $supplier = Supplier::create(['code' => 'SUP-'.$suffix, 'name' => 'Distributor Maju']);
    $product = Product::create([
        'sku' => 'SKU-'.$suffix,
        'name' => 'Kopi Arabica',
        'slug' => 'kopi-'.$suffix,
        'category_id' => Category::create(['name' => 'Minuman '.$suffix, 'slug' => 'minuman-'.$suffix])->id,
        'unit_id' => Unit::create(['name' => 'Pcs '.$suffix, 'symbol' => 'pcs-'.$suffix])->id,
        'cost_price' => 20000,
        'selling_price' => 30000,
    ]);

    $this->actingAs(documentUser(['inventory.purchase']));

    $response = $this->post(route('purchases.store'), [
        'supplier_id' => $supplier->id,
        'store_id' => $store->id,
        'document_id' => $document->id,
        'items' => [
            ['product_id' => $product->id, 'qty_ordered' => 2, 'cost_price' => 30000],
        ],
    ]);

    $response->assertRedirect(route('purchases.index'));

    $purchase = Purchase::latest('id')->firstOrFail();
    expect($purchase->status)->toBe('draft');

    $document = $document->refresh();
    expect($document->status)->toBe('verified');
    expect($document->purchase_id)->toBe($purchase->id);
});

test('verified documents cannot be deleted', function () {
    fakeOcr();
    $document = uploadedDocument($this);
    $document->update(['status' => 'verified']);
    $this->actingAs(documentUser(['inventory.purchase']));

    $this->delete(route('documents.destroy', $document))->assertRedirect();
    $this->assertDatabaseHas('documents', ['id' => $document->id]);
});
