<?php

use App\Http\Controllers\AiChatController;
use App\Http\Controllers\AnomalyController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\CashSessionController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SaleReturnController;
use App\Http\Controllers\StockAdjustmentController;
use App\Http\Controllers\StoreController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('reports', [ReportController::class, 'index'])
        ->middleware('permission:reports.view')
        ->name('reports.index');

    Route::get('ai', [AiChatController::class, 'index'])
        ->middleware('permission:ai.use')
        ->name('ai.index');
    Route::post('ai/chat', [AiChatController::class, 'chat'])
        ->middleware(['permission:ai.use', 'throttle:15,1'])
        ->name('ai.chat');
    Route::post('ai/stream', [AiChatController::class, 'stream'])
        ->middleware(['permission:ai.use', 'throttle:15,1'])
        ->name('ai.stream');
    Route::post('ai/briefing', [AiChatController::class, 'briefing'])
        ->middleware(['permission:ai.use', 'throttle:10,60'])
        ->name('ai.briefing');
    Route::get('ai/conversations', [AiChatController::class, 'conversations'])
        ->middleware('permission:ai.use')
        ->name('ai.conversations');
    Route::get('ai/conversations/{conversation}', [AiChatController::class, 'show'])
        ->middleware('permission:ai.use')
        ->name('ai.conversation');
    Route::delete('ai/conversations/{conversation}', [AiChatController::class, 'destroy'])
        ->middleware('permission:ai.use')
        ->name('ai.conversation.destroy');

    Route::patch('anomalies/{anomaly}', [AnomalyController::class, 'review'])
        ->middleware('permission:sales.view')
        ->name('anomalies.review');

    Route::get('documents', [DocumentController::class, 'index'])
        ->middleware('permission:inventory.purchase')
        ->name('documents.index');
    Route::get('documents/create', [DocumentController::class, 'create'])
        ->middleware('permission:inventory.purchase')
        ->name('documents.create');
    Route::post('documents', [DocumentController::class, 'store'])
        ->middleware('permission:inventory.purchase')
        ->name('documents.store');
    Route::get('documents/{document}', [DocumentController::class, 'show'])
        ->middleware('permission:inventory.purchase')
        ->name('documents.show');
    Route::get('documents/{document}/file', [DocumentController::class, 'file'])
        ->middleware('permission:inventory.purchase')
        ->name('documents.file');
    Route::get('documents/{document}/verify', [DocumentController::class, 'verify'])
        ->middleware('permission:inventory.purchase')
        ->name('documents.verify');
    Route::delete('documents/{document}', [DocumentController::class, 'destroy'])
        ->middleware('permission:inventory.purchase')
        ->name('documents.destroy');

    Route::get('customers', [CustomerController::class, 'index'])
        ->middleware('permission:customers.view')
        ->name('customers.index');
    Route::get('customers/create', [CustomerController::class, 'create'])
        ->middleware('permission:customers.manage')
        ->name('customers.create');
    Route::post('customers', [CustomerController::class, 'store'])
        ->middleware('permission:customers.manage')
        ->name('customers.store');
    Route::post('customers/quick', [CustomerController::class, 'quickStore'])
        ->middleware('permission:customers.manage')
        ->name('customers.quick');
    Route::get('customers/{customer}/edit', [CustomerController::class, 'edit'])
        ->middleware('permission:customers.manage')
        ->name('customers.edit');
    Route::match(['put', 'patch'], 'customers/{customer}', [CustomerController::class, 'update'])
        ->middleware('permission:customers.manage')
        ->name('customers.update');
    Route::delete('customers/{customer}', [CustomerController::class, 'destroy'])
        ->middleware('permission:customers.manage')
        ->name('customers.destroy');

    Route::get('suppliers', [SupplierController::class, 'index'])
        ->middleware('permission:suppliers.view')
        ->name('suppliers.index');
    Route::get('suppliers/create', [SupplierController::class, 'create'])
        ->middleware('permission:suppliers.manage')
        ->name('suppliers.create');
    Route::post('suppliers', [SupplierController::class, 'store'])
        ->middleware('permission:suppliers.manage')
        ->name('suppliers.store');
    Route::get('suppliers/{supplier}/edit', [SupplierController::class, 'edit'])
        ->middleware('permission:suppliers.manage')
        ->name('suppliers.edit');
    Route::match(['put', 'patch'], 'suppliers/{supplier}', [SupplierController::class, 'update'])
        ->middleware('permission:suppliers.manage')
        ->name('suppliers.update');
    Route::delete('suppliers/{supplier}', [SupplierController::class, 'destroy'])
        ->middleware('permission:suppliers.manage')
        ->name('suppliers.destroy');

    Route::get('stores', [StoreController::class, 'index'])
        ->middleware('permission:settings.manage')
        ->name('stores.index');
    Route::get('stores/create', [StoreController::class, 'create'])
        ->middleware('permission:settings.manage')
        ->name('stores.create');
    Route::post('stores', [StoreController::class, 'store'])
        ->middleware('permission:settings.manage')
        ->name('stores.store');
    Route::get('stores/{store}/edit', [StoreController::class, 'edit'])
        ->middleware('permission:settings.manage')
        ->name('stores.edit');
    Route::match(['put', 'patch'], 'stores/{store}', [StoreController::class, 'update'])
        ->middleware('permission:settings.manage')
        ->name('stores.update');
    Route::delete('stores/{store}', [StoreController::class, 'destroy'])
        ->middleware('permission:settings.manage')
        ->name('stores.destroy');

    Route::get('categories', [CategoryController::class, 'index'])
        ->middleware('permission:products.manage')
        ->name('categories.index');
    Route::get('categories/create', [CategoryController::class, 'create'])
        ->middleware('permission:products.manage')
        ->name('categories.create');
    Route::post('categories', [CategoryController::class, 'store'])
        ->middleware('permission:products.manage')
        ->name('categories.store');
    Route::get('categories/{category}/edit', [CategoryController::class, 'edit'])
        ->middleware('permission:products.manage')
        ->name('categories.edit');
    Route::match(['put', 'patch'], 'categories/{category}', [CategoryController::class, 'update'])
        ->middleware('permission:products.manage')
        ->name('categories.update');
    Route::delete('categories/{category}', [CategoryController::class, 'destroy'])
        ->middleware('permission:products.manage')
        ->name('categories.destroy');

    Route::get('brands', [BrandController::class, 'index'])
        ->middleware('permission:products.manage')
        ->name('brands.index');
    Route::get('brands/create', [BrandController::class, 'create'])
        ->middleware('permission:products.manage')
        ->name('brands.create');
    Route::post('brands', [BrandController::class, 'store'])
        ->middleware('permission:products.manage')
        ->name('brands.store');
    Route::get('brands/{brand}/edit', [BrandController::class, 'edit'])
        ->middleware('permission:products.manage')
        ->name('brands.edit');
    Route::match(['put', 'patch'], 'brands/{brand}', [BrandController::class, 'update'])
        ->middleware('permission:products.manage')
        ->name('brands.update');
    Route::delete('brands/{brand}', [BrandController::class, 'destroy'])
        ->middleware('permission:products.manage')
        ->name('brands.destroy');

    Route::get('units', [UnitController::class, 'index'])
        ->middleware('permission:products.manage')
        ->name('units.index');
    Route::get('units/create', [UnitController::class, 'create'])
        ->middleware('permission:products.manage')
        ->name('units.create');
    Route::post('units', [UnitController::class, 'store'])
        ->middleware('permission:products.manage')
        ->name('units.store');
    Route::get('units/{unit}/edit', [UnitController::class, 'edit'])
        ->middleware('permission:products.manage')
        ->name('units.edit');
    Route::match(['put', 'patch'], 'units/{unit}', [UnitController::class, 'update'])
        ->middleware('permission:products.manage')
        ->name('units.update');
    Route::delete('units/{unit}', [UnitController::class, 'destroy'])
        ->middleware('permission:products.manage')
        ->name('units.destroy');

    Route::get('products', [ProductController::class, 'index'])
        ->middleware('permission:products.view')
        ->name('products.index');
    Route::get('products/create', [ProductController::class, 'create'])
        ->middleware('permission:products.manage')
        ->name('products.create');
    Route::post('products', [ProductController::class, 'store'])
        ->middleware('permission:products.manage')
        ->name('products.store');
    Route::get('products/{product}/edit', [ProductController::class, 'edit'])
        ->middleware('permission:products.manage')
        ->name('products.edit');
    Route::match(['put', 'patch'], 'products/{product}', [ProductController::class, 'update'])
        ->middleware('permission:products.manage')
        ->name('products.update');
    Route::delete('products/{product}', [ProductController::class, 'destroy'])
        ->middleware('permission:products.manage')
        ->name('products.destroy');

    Route::get('purchases', [PurchaseController::class, 'index'])
        ->middleware('permission:inventory.purchase')
        ->name('purchases.index');
    Route::get('purchases/create', [PurchaseController::class, 'create'])
        ->middleware('permission:inventory.purchase')
        ->name('purchases.create');
    Route::post('purchases', [PurchaseController::class, 'store'])
        ->middleware('permission:inventory.purchase')
        ->name('purchases.store');
    Route::get('purchases/{purchase}', [PurchaseController::class, 'show'])
        ->middleware('permission:inventory.purchase')
        ->name('purchases.show');
    Route::get('purchases/{purchase}/edit', [PurchaseController::class, 'edit'])
        ->middleware('permission:inventory.purchase')
        ->name('purchases.edit');
    Route::match(['put', 'patch'], 'purchases/{purchase}', [PurchaseController::class, 'update'])
        ->middleware('permission:inventory.purchase')
        ->name('purchases.update');
    Route::delete('purchases/{purchase}', [PurchaseController::class, 'destroy'])
        ->middleware('permission:inventory.purchase')
        ->name('purchases.destroy');
    Route::patch('purchases/{purchase}/order', [PurchaseController::class, 'order'])
        ->middleware('permission:inventory.purchase')
        ->name('purchases.order');
    Route::patch('purchases/{purchase}/cancel', [PurchaseController::class, 'cancel'])
        ->middleware('permission:inventory.purchase')
        ->name('purchases.cancel');
    Route::post('purchases/{purchase}/receive', [PurchaseController::class, 'receive'])
        ->middleware('permission:inventory.purchase')
        ->name('purchases.receive');
    Route::post('purchases/{purchase}/payments', [PurchaseController::class, 'pay'])
        ->middleware('permission:inventory.purchase')
        ->name('purchases.payments');

    Route::get('adjustments', [StockAdjustmentController::class, 'index'])
        ->middleware('permission:inventory.adjust')
        ->name('adjustments.index');
    Route::get('adjustments/create', [StockAdjustmentController::class, 'create'])
        ->middleware('permission:inventory.adjust')
        ->name('adjustments.create');
    Route::post('adjustments', [StockAdjustmentController::class, 'store'])
        ->middleware('permission:inventory.adjust')
        ->name('adjustments.store');
    Route::get('adjustments/{adjustment}', [StockAdjustmentController::class, 'show'])
        ->middleware('permission:inventory.adjust')
        ->name('adjustments.show');
    Route::get('adjustments/{adjustment}/edit', [StockAdjustmentController::class, 'edit'])
        ->middleware('permission:inventory.adjust')
        ->name('adjustments.edit');
    Route::match(['put', 'patch'], 'adjustments/{adjustment}', [StockAdjustmentController::class, 'update'])
        ->middleware('permission:inventory.adjust')
        ->name('adjustments.update');
    Route::delete('adjustments/{adjustment}', [StockAdjustmentController::class, 'destroy'])
        ->middleware('permission:inventory.adjust')
        ->name('adjustments.destroy');
    Route::patch('adjustments/{adjustment}/approve', [StockAdjustmentController::class, 'approve'])
        ->middleware('permission:inventory.adjust')
        ->name('adjustments.approve');

    Route::get('pos', [SaleController::class, 'pos'])
        ->middleware('permission:sales.create')
        ->name('pos.index');
    Route::post('pos/checkout', [SaleController::class, 'checkout'])
        ->middleware('permission:sales.create')
        ->name('pos.checkout');
    Route::get('sales', [SaleController::class, 'index'])
        ->middleware('permission:sales.view')
        ->name('sales.index');
    Route::get('sales/{sale}', [SaleController::class, 'show'])
        ->middleware('permission:sales.view')
        ->name('sales.show');

    Route::get('returns', [SaleReturnController::class, 'index'])
        ->middleware('permission:sales.view')
        ->name('returns.index');
    Route::get('sales/{sale}/returns/create', [SaleReturnController::class, 'create'])
        ->middleware('permission:sales.refund')
        ->name('returns.create');
    Route::post('sales/{sale}/returns', [SaleReturnController::class, 'store'])
        ->middleware('permission:sales.refund')
        ->name('returns.store');

    Route::get('sessions', [CashSessionController::class, 'index'])
        ->middleware('permission:sales.view')
        ->name('sessions.index');
    Route::get('sessions/create', [CashSessionController::class, 'create'])
        ->middleware('permission:sales.create')
        ->name('sessions.create');
    Route::post('sessions', [CashSessionController::class, 'store'])
        ->middleware('permission:sales.create')
        ->name('sessions.store');
    Route::patch('sessions/{session}/close', [CashSessionController::class, 'close'])
        ->middleware('permission:sales.create')
        ->name('sessions.close');

    Route::get('users', [UserController::class, 'index'])
        ->middleware('permission:users.manage')
        ->name('users.index');
    Route::get('users/create', [UserController::class, 'create'])
        ->middleware('permission:users.manage')
        ->name('users.create');
    Route::post('users', [UserController::class, 'store'])
        ->middleware('permission:users.manage')
        ->name('users.store');
    Route::get('users/{user}/edit', [UserController::class, 'edit'])
        ->middleware('permission:users.manage')
        ->name('users.edit');
    Route::match(['put', 'patch'], 'users/{user}', [UserController::class, 'update'])
        ->middleware('permission:users.manage')
        ->name('users.update');
    Route::delete('users/{user}', [UserController::class, 'destroy'])
        ->middleware('permission:users.manage')
        ->name('users.destroy');

    Route::get('roles', [RoleController::class, 'index'])
        ->middleware('permission:users.manage')
        ->name('roles.index');
    Route::get('roles/{role}/edit', [RoleController::class, 'edit'])
        ->middleware('permission:users.manage')
        ->name('roles.edit');
    Route::match(['put', 'patch'], 'roles/{role}', [RoleController::class, 'update'])
        ->middleware('permission:users.manage')
        ->name('roles.update');
});

require __DIR__.'/settings.php';
