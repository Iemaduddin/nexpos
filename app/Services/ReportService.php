<?php

namespace App\Services;

use App\AI\AiException;
use App\Models\BusinessSetting;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchasePayment;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use App\Models\StockLevel;
use App\Models\StockMovement;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Deterministic business aggregates for dashboards, reports, and AI tools.
 *
 * All money is in integer minor units (Rupiah). Date boundaries are resolved
 * in the business timezone; the LLM must never compute them.
 */
class ReportService
{
    public const PERIODS = [
        'today' => 'Hari ini',
        'yesterday' => 'Kemarin',
        'last_7_days' => '7 hari terakhir',
        'last_30_days' => '30 hari terakhir',
        'this_month' => 'Bulan ini',
    ];

    public function timezone(): string
    {
        $settings = BusinessSetting::first();

        if ($settings !== null) {
            return $settings->timezone;
        }

        return (string) config('app.timezone', 'UTC');
    }

    /**
     * Resolve a period key into exact timestamps.
     *
     * @return array{start: CarbonInterface, end: CarbonInterface, label: string}
     */
    public function resolveRange(string $period, ?CarbonInterface $now = null): array
    {
        $tz = $this->timezone();
        $now = ($now ?? now())->setTimezone($tz);

        [$start, $end] = match ($period) {
            'yesterday' => [$now->copy()->subDay()->startOfDay(), $now->copy()->subDay()->endOfDay()],
            'last_7_days' => [$now->copy()->subDays(6)->startOfDay(), $now->copy()->endOfDay()],
            'last_30_days' => [$now->copy()->subDays(29)->startOfDay(), $now->copy()->endOfDay()],
            'this_month' => [$now->copy()->startOfMonth(), $now->copy()->endOfDay()],
            default => [$now->copy()->startOfDay(), $now->copy()->endOfDay()],
        };

        return [
            'start' => $start,
            'end' => $end,
            'label' => self::PERIODS[$period] ?? self::PERIODS['today'],
        ];
    }

    /**
     * Revenue, transactions, profit, and refunds for a range.
     *
     * Profit = item margins - cart discounts - refunds (tax excluded).
     *
     * @return array<string, int>
     */
    public function overview(CarbonInterface $start, CarbonInterface $end): array
    {
        $sales = $this->salesIn($start, $end);

        $revenue = (int) $sales->sum('grand_total');
        $transactions = $sales->count();
        $discounts = (int) $sales->sum('discount_total');

        $items = SaleItem::query()
            ->whereIn('sale_id', $sales->pluck('id'))
            ->get(['qty', 'unit_price', 'cost_price', 'discount', 'subtotal']);

        $margin = (int) $items->sum(fn ($item) => $item->qty * $item->unit_price - $item->qty * $item->cost_price - $item->discount);
        $refunds = (int) $this->returnsIn($start, $end)->sum('total_refund');

        return [
            'revenue' => $revenue,
            'refunds' => $refunds,
            'net_revenue' => $revenue - $refunds,
            'transactions' => $transactions,
            'avg_transaction' => $transactions > 0 ? (int) round($revenue / $transactions) : 0,
            'items_sold' => (int) $items->sum('qty'),
            'profit' => $margin - $discounts - $refunds,
        ];
    }

    /**
     * Per-day revenue, transactions, and profit, oldest first.
     *
     * @return list<array{date: string, label: string, revenue: int, refunds: int, transactions: int, profit: int}>
     */
    public function daily(CarbonInterface $start, CarbonInterface $end): array
    {
        $tz = $this->timezone();
        $sales = $this->salesIn($start, $end)->groupBy(
            fn ($sale) => $sale->completed_at->setTimezone($tz)->toDateString()
        );
        $refundsByDay = $this->returnsIn($start, $end)->groupBy(
            fn ($ret) => $ret->created_at->setTimezone($tz)->toDateString()
        );

        $days = [];
        for ($day = $start->copy()->startOfDay(); $day->lte($end); $day = $day->copy()->addDay()) {
            $key = $day->toDateString();
            $daySales = $sales->get($key, collect());
            $ids = $daySales->pluck('id');

            $items = $ids->isEmpty() ? collect() : SaleItem::query()
                ->whereIn('sale_id', $ids)
                ->get(['qty', 'unit_price', 'cost_price', 'discount']);

            $margin = (int) $items->sum(fn ($item) => $item->qty * $item->unit_price - $item->qty * $item->cost_price - $item->discount);
            $refunds = (int) ($refundsByDay->get($key, collect())->sum('total_refund'));

            $days[] = [
                'date' => $key,
                'label' => $day->isoFormat('D MMM'),
                'revenue' => (int) $daySales->sum('grand_total'),
                'refunds' => $refunds,
                'transactions' => $daySales->count(),
                'profit' => $margin - (int) $daySales->sum('discount_total') - $refunds,
            ];
        }

        return $days;
    }

    /**
     * Sales activity grouped by local hour.
     *
     * @return list<array{hour: int, label: string, transactions: int, revenue: int}>
     */
    public function hourlySales(CarbonInterface $start, CarbonInterface $end): array
    {
        $tz = $this->timezone();
        $sales = $this->salesIn($start, $end)->groupBy(
            fn ($sale) => (int) $sale->completed_at->setTimezone($tz)->format('G')
        );

        return array_values(collect(range(0, 23))->map(function (int $hour) use ($sales): array {
            $rows = $sales->get($hour, collect());

            return [
                'hour' => $hour,
                'label' => sprintf('%02d.00', $hour),
                'transactions' => $rows->count(),
                'revenue' => (int) $rows->sum('grand_total'),
            ];
        })->all());
    }

    /**
     * Payment method distribution for a sales range.
     *
     * @return list<array{method: string, amount: int, transactions: int}>
     */
    public function paymentSummary(CarbonInterface $start, CarbonInterface $end): array
    {
        $rows = Payment::query()
            ->with('sale:id,status,completed_at')
            ->whereHas('sale', fn ($query) => $query
                ->whereIn('status', ['completed', 'partial_refund'])
                ->whereBetween('completed_at', [$start->copy()->setTimezone('UTC'), $end->copy()->setTimezone('UTC')]))
            ->get(['method', 'amount', 'sale_id']);

        return array_values($rows->groupBy('method')->map(fn ($payments, $method): array => [
            'method' => (string) $method,
            'amount' => (int) $payments->sum('amount'),
            'transactions' => $payments->pluck('sale_id')->unique()->count(),
        ])->all());
    }

    /**
     * Current tracked stock health distribution.
     *
     * @return list<array{name: string, value: int}>
     */
    public function stockSummary(): array
    {
        $products = Product::query()
            ->where('is_active', true)
            ->where('track_inventory', true)
            ->withSum('stockLevels as stock', 'qty_on_hand')
            ->get(['id', 'low_stock_threshold']);

        $summary = ['Aman' => 0, 'Menipis' => 0, 'Habis' => 0];

        foreach ($products as $product) {
            $stock = (int) ($product->getAttribute('stock') ?? 0);

            if ($stock <= 0) {
                $summary['Habis']++;
            } elseif ($stock <= $product->low_stock_threshold) {
                $summary['Menipis']++;
            } else {
                $summary['Aman']++;
            }
        }

        return array_values(collect($summary)->map(fn (int $value, string $name): array => [
            'name' => $name,
            'value' => $value,
        ])->all());
    }

    /**
     * Revenue grouped by product category.
     *
     * @return list<array{name: string, revenue: int}>
     */
    public function categoryRevenue(CarbonInterface $start, CarbonInterface $end, int $limit = 8): array
    {
        $saleIds = $this->salesIn($start, $end)->pluck('id');

        if ($saleIds->isEmpty()) {
            return [];
        }

        return array_values(SaleItem::query()
            ->with('product.category:id,name')
            ->whereIn('sale_id', $saleIds)
            ->get(['product_id', 'subtotal'])
            ->groupBy(fn ($item) => $item->product->category->name ?? 'Tanpa kategori')
            ->map(fn ($items, $name): array => [
                'name' => (string) $name,
                'revenue' => (int) $items->sum('subtotal'),
            ])
            ->sortByDesc('revenue')
            ->take($limit)
            ->all());
    }

    /**
     * Best-selling products by quantity sold.
     *
     * @return list<array{id: int, name: string, sku: string, qty: int, revenue: int}>
     */
    public function topProducts(CarbonInterface $start, CarbonInterface $end, int $limit = 5): array
    {
        $saleIds = $this->salesIn($start, $end)->pluck('id');

        if ($saleIds->isEmpty()) {
            return [];
        }

        $rows = SaleItem::query()
            ->selectRaw('product_id, SUM(qty) as qty, SUM(subtotal) as revenue')
            ->with('product:id,name,sku')
            ->whereIn('sale_id', $saleIds)
            ->groupBy('product_id')
            ->orderByDesc('qty')
            ->limit($limit)
            ->get();

        $top = [];

        foreach ($rows as $row) {
            $top[] = [
                'id' => $row->product_id,
                'name' => $row->product->name,
                'sku' => $row->product->sku,
                'qty' => (int) $row->getAttribute('qty'),
                'revenue' => (int) $row->getAttribute('revenue'),
            ];
        }

        return $top;
    }

    /**
     * Tracked products at or below their low-stock threshold.
     *
     * @return list<array{id: int, name: string, sku: string, stock: int, threshold: int}>
     */
    public function lowStock(int $limit = 5): array
    {
        $products = Product::query()
            ->where('is_active', true)
            ->where('track_inventory', true)
            ->withSum('stockLevels as stock', 'qty_on_hand')
            ->get();

        $candidates = [];

        foreach ($products as $product) {
            $stock = (int) ($product->getAttribute('stock') ?? 0);

            if ($stock > $product->low_stock_threshold) {
                continue;
            }

            $candidates[] = [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'stock' => $stock,
                'threshold' => $product->low_stock_threshold,
            ];
        }

        usort($candidates, fn ($a, $b) => $a['stock'] <=> $b['stock']);

        return array_slice($candidates, 0, $limit);
    }

    /**
     * Total inventory value at cost price.
     */
    public function inventoryValue(): int
    {
        $levels = StockLevel::query()
            ->where('qty_on_hand', '>', 0)
            ->with(['product:id,cost_price', 'variant:id,cost_price'])
            ->get();

        $total = 0.0;

        foreach ($levels as $level) {
            $cost = $level->variant_id !== null
                ? $level->variant->cost_price
                : $level->product->cost_price;
            $total += $level->qty_on_hand * $cost;
        }

        return (int) round($total);
    }

    /**
     * Latest completed sales.
     *
     * @return Collection<int, Sale>
     */
    public function recentSales(int $limit = 5): Collection
    {
        return Sale::query()
            ->with(['customer:id,name', 'cashier:id,name'])
            ->whereIn('status', ['completed', 'partial_refund'])
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    /**
     * Resolve the previous comparable range (same length, right before).
     *
     * @return array{start: CarbonInterface, end: CarbonInterface, label: string}
     */
    public function previousRange(string $period, ?CarbonInterface $now = null): array
    {
        $tz = $this->timezone();
        $now = ($now ?? now())->setTimezone($tz);

        [$start, $end, $label] = match ($period) {
            'yesterday' => [
                $now->copy()->subDays(2)->startOfDay(),
                $now->copy()->subDays(2)->endOfDay(),
                'Sehari sebelumnya',
            ],
            'last_7_days' => [
                $now->copy()->subDays(13)->startOfDay(),
                $now->copy()->subDays(7)->endOfDay(),
                '7 hari sebelumnya',
            ],
            'last_30_days' => [
                $now->copy()->subDays(59)->startOfDay(),
                $now->copy()->subDays(30)->endOfDay(),
                '30 hari sebelumnya',
            ],
            'this_month' => [
                $now->copy()->subMonthNoOverflow()->startOfMonth(),
                $now->copy()->subMonthNoOverflow()->endOfMonth(),
                'Bulan lalu',
            ],
            default => [
                $now->copy()->subDay()->startOfDay(),
                $now->copy()->subDay()->endOfDay(),
                'Kemarin',
            ],
        };

        return ['start' => $start, 'end' => $end, 'label' => $label];
    }

    /**
     * Current vs previous period with deltas.
     *
     * @return array<string, mixed>
     */
    public function comparison(string $period): array
    {
        $current = $this->resolveRange($period);
        $previous = $this->previousRange($period);

        $now = $this->overview($current['start'], $current['end']);
        $before = $this->overview($previous['start'], $previous['end']);

        return [
            'period' => $period,
            'period_label' => $current['label'],
            'previous_label' => $previous['label'],
            'current' => $now,
            'previous' => $before,
            'revenue_diff' => $now['revenue'] - $before['revenue'],
            'revenue_pct' => $before['revenue'] > 0
                ? (int) round(($now['revenue'] - $before['revenue']) / $before['revenue'] * 100)
                : null,
            'transactions_diff' => $now['transactions'] - $before['transactions'],
        ];
    }

    /**
     * Inventory headline numbers.
     *
     * @return array<string, int>
     */
    public function inventorySummary(): array
    {
        $products = Product::query()
            ->where('is_active', true)
            ->where('track_inventory', true)
            ->withSum('stockLevels as stock', 'qty_on_hand')
            ->get(['id', 'low_stock_threshold']);

        $totalUnits = 0;
        $lowStock = 0;
        $outOfStock = 0;

        foreach ($products as $product) {
            $stock = (int) ($product->getAttribute('stock') ?? 0);
            $totalUnits += max(0, $stock);

            if ($stock <= $product->low_stock_threshold) {
                $lowStock++;
            }

            if ($stock <= 0) {
                $outOfStock++;
            }
        }

        return [
            'tracked_products' => $products->count(),
            'total_units' => $totalUnits,
            'low_stock_count' => $lowStock,
            'out_of_stock_count' => $outOfStock,
            'inventory_value' => $this->inventoryValue(),
        ];
    }

    /**
     * Latest stock ledger movements, newest first.
     *
     * @return list<array<string, mixed>>
     */
    public function recentMovements(int $limit = 10, ?string $type = null): array
    {
        $movements = StockMovement::query()
            ->with(['product:id,name,sku', 'store:id,name'])
            ->when($type, fn ($query) => $query->where('type', $type))
            ->orderByDesc('id')
            ->limit(min($limit, 20))
            ->get();

        $rows = [];

        foreach ($movements as $movement) {
            $rows[] = [
                'id' => $movement->id,
                'type' => $movement->type,
                'product' => $movement->product->name,
                'sku' => $movement->product->sku,
                'store' => $movement->store->name,
                'qty_change' => $movement->qty_change,
                'qty_after' => $movement->qty_after,
                'at' => $movement->created_at->toDateTimeString(),
            ];
        }

        return $rows;
    }

    /**
     * Customer headline numbers.
     *
     * @return array<string, int>
     */
    public function customerSummary(): array
    {
        $tz = $this->timezone();

        return [
            'total_customers' => Customer::count(),
            'repeat_customers' => Customer::where('transaction_count', '>', 1)->count(),
            'new_this_month' => Customer::where('created_at', '>=', now()->setTimezone($tz)->startOfMonth()->setTimezone('UTC'))->count(),
        ];
    }

    /**
     * Top customers by total spending.
     *
     * @return list<array<string, mixed>>
     */
    public function topCustomers(int $limit = 5): array
    {
        $customers = Customer::query()
            ->orderByDesc('total_spent')
            ->limit(min($limit, 10))
            ->get(['id', 'name', 'phone', 'transaction_count', 'total_spent']);

        $rows = [];

        foreach ($customers as $customer) {
            $rows[] = [
                'id' => $customer->id,
                'name' => $customer->name,
                'phone' => $customer->phone,
                'transactions' => $customer->transaction_count,
                'total_spent' => $customer->total_spent,
            ];
        }

        return $rows;
    }

    /**
     * Single-product performance for a range.
     *
     * @return array<string, mixed>
     *
     * @throws AiException
     */
    public function productPerformance(string $query, CarbonInterface $start, CarbonInterface $end): array
    {
        $product = Product::query()
            ->where('sku', $query)
            ->orWhere('name', 'like', "%{$query}%")
            ->orderBy('id')
            ->first(['id', 'name', 'sku', 'selling_price', 'low_stock_threshold', 'track_inventory']);

        if (! $product) {
            throw new AiException('Produk tidak ditemukan.');
        }

        $saleIds = $this->salesIn($start, $end)->pluck('id');

        $items = $saleIds->isEmpty() ? collect() : SaleItem::query()
            ->whereIn('sale_id', $saleIds)
            ->where('product_id', $product->id)
            ->get(['qty', 'unit_price', 'cost_price', 'discount', 'subtotal']);

        $stock = $product->track_inventory
            ? (int) StockLevel::where('product_id', $product->id)->sum('qty_on_hand')
            : 0;

        return [
            'id' => $product->id,
            'name' => $product->name,
            'sku' => $product->sku,
            'selling_price' => $product->selling_price,
            'qty_sold' => (int) $items->sum('qty'),
            'revenue' => (int) $items->sum('subtotal'),
            'profit' => (int) $items->sum(fn ($item) => $item->qty * $item->unit_price - $item->qty * $item->cost_price - $item->discount),
            'stock' => $stock,
            'threshold' => $product->low_stock_threshold,
        ];
    }

    /**
     * Purchasing headline numbers for a range.
     *
     * @return array<string, mixed>
     */
    public function purchaseSummary(CarbonInterface $start, CarbonInterface $end): array
    {
        $purchases = Purchase::query()
            ->whereBetween('created_at', [$start->copy()->setTimezone('UTC'), $end->copy()->setTimezone('UTC')])
            ->get(['grand_total', 'paid_amount', 'status']);

        return [
            'count' => $purchases->count(),
            'grand_total' => (int) $purchases->sum('grand_total'),
            'paid' => (int) $purchases->sum('paid_amount'),
            'payable' => (int) ($purchases->sum('grand_total') - $purchases->sum('paid_amount')),
            'by_status' => $purchases->countBy('status')->all(),
        ];
    }

    /**
     * Cost of goods sold for a range, net of returned items.
     *
     * Gross HPP comes from the cost snapshot stored on each sale item;
     * returns reverse the same snapshot through the parent sale item,
     * so margin stays consistent with overview().
     *
     * @return array{gross_cogs: int, returned_cogs: int, net_cogs: int, net_revenue: int, gross_margin: int, margin_pct: int|null}
     */
    public function cogsSummary(CarbonInterface $start, CarbonInterface $end): array
    {
        $sales = $this->salesIn($start, $end);
        $ids = $sales->pluck('id');

        $items = $ids->isEmpty() ? collect() : SaleItem::query()
            ->whereIn('sale_id', $ids)
            ->get(['qty', 'cost_price']);

        $gross = (int) $items->sum(fn ($item) => $item->qty * $item->cost_price);
        $returned = $this->returnedCogs($start, $end);
        $net = $gross - $returned;

        $netRevenue = (int) $sales->sum('grand_total') - (int) $this->returnsIn($start, $end)->sum('total_refund');
        $margin = $netRevenue - $net;

        return [
            'gross_cogs' => $gross,
            'returned_cogs' => $returned,
            'net_cogs' => $net,
            'net_revenue' => $netRevenue,
            'gross_margin' => $margin,
            'margin_pct' => $netRevenue > 0 ? (int) round($margin / $netRevenue * 100) : null,
        ];
    }

    /**
     * Net HPP and margin per product, most expensive first.
     *
     * @return list<array{id: int, name: string, sku: string, qty: float, revenue: int, refunds: int, cogs: int, margin: int}>
     */
    public function cogsByProduct(CarbonInterface $start, CarbonInterface $end, int $limit = 10): array
    {
        $saleIds = $this->salesIn($start, $end)->pluck('id');

        $rows = [];

        if (! $saleIds->isEmpty()) {
            $items = SaleItem::query()
                ->with('product:id,name,sku')
                ->whereIn('sale_id', $saleIds)
                ->get(['product_id', 'qty', 'cost_price', 'subtotal']);

            foreach ($items as $item) {
                $pid = $item->product_id;

                if (! isset($rows[$pid])) {
                    $rows[$pid] = [
                        'id' => $pid,
                        'name' => $item->product->name,
                        'sku' => $item->product->sku,
                        'qty' => 0.0,
                        'revenue' => 0,
                        'refunds' => 0,
                        'cogs' => 0,
                        'margin' => 0,
                    ];
                }

                $rows[$pid]['qty'] += (float) $item->qty;
                $rows[$pid]['revenue'] += (int) $item->subtotal;
                $rows[$pid]['cogs'] += (int) round((float) $item->qty * $item->cost_price);
            }
        }

        foreach ($this->returnItemsIn($start, $end) as $item) {
            $cost = $item->saleItem->cost_price ?? 0;

            if (! isset($rows[$item->product_id])) {
                $rows[$item->product_id] = [
                    'id' => $item->product_id,
                    'name' => $item->product->name,
                    'sku' => $item->product->sku,
                    'qty' => 0.0,
                    'revenue' => 0,
                    'refunds' => 0,
                    'cogs' => 0,
                    'margin' => 0,
                ];
            }

            $rows[$item->product_id]['qty'] -= (float) $item->qty;
            $rows[$item->product_id]['refunds'] += (int) $item->refund_amount;
            $rows[$item->product_id]['cogs'] -= (int) round((float) $item->qty * $cost);
        }

        foreach ($rows as $id => $row) {
            $rows[$id]['margin'] = ($row['revenue'] - $row['refunds']) - $row['cogs'];
        }

        usort($rows, fn ($a, $b) => $b['cogs'] <=> $a['cogs']);

        return array_slice($rows, 0, max(1, $limit));
    }

    /**
     * Per-day net HPP and margin, oldest first.
     *
     * @return list<array{date: string, label: string, revenue: int, cogs: int, margin: int}>
     */
    public function cogsDaily(CarbonInterface $start, CarbonInterface $end): array
    {
        $tz = $this->timezone();
        $sales = $this->salesIn($start, $end)->groupBy(
            fn ($sale) => $sale->completed_at->setTimezone($tz)->toDateString()
        );

        $returns = SaleReturn::query()
            ->whereBetween('created_at', [$start->copy()->setTimezone('UTC'), $end->copy()->setTimezone('UTC')])
            ->with('items.saleItem:id,cost_price')
            ->get()
            ->groupBy(fn ($ret) => $ret->created_at->setTimezone($tz)->toDateString());

        $days = [];

        for ($day = $start->copy()->startOfDay(); $day->lte($end); $day = $day->copy()->addDay()) {
            $key = $day->toDateString();
            $ids = $sales->get($key, collect())->pluck('id');

            $items = $ids->isEmpty() ? collect() : SaleItem::query()
                ->whereIn('sale_id', $ids)
                ->get(['qty', 'cost_price', 'subtotal']);

            $cogs = (int) $items->sum(fn ($item) => $item->qty * $item->cost_price);

            $dayReturns = $returns->get($key, collect());
            $refunds = (int) $dayReturns->sum('total_refund');
            $retCogs = 0;

            foreach ($dayReturns as $ret) {
                foreach ($ret->items as $item) {
                    $retCogs += (int) round((float) $item->qty * ($item->saleItem->cost_price ?? 0));
                }
            }

            $netCogs = $cogs - $retCogs;
            $netRevenue = (int) $sales->get($key, collect())->sum('grand_total') - $refunds;

            $days[] = [
                'date' => $key,
                'label' => $day->isoFormat('D MMM'),
                'revenue' => $netRevenue,
                'cogs' => $netCogs,
                'margin' => $netRevenue - $netCogs,
            ];
        }

        return $days;
    }

    /**
     * Cash flow for a range: money in from sales, money out to suppliers
     * and refunds, plus the opening position carried from history.
     *
     * Cash basis: payments count when paid, not when invoiced.
     *
     * @return array<string, mixed>
     */
    public function cashFlow(CarbonInterface $start, CarbonInterface $end): array
    {
        $tz = $this->timezone();
        $utcStart = $start->copy()->setTimezone('UTC');
        $utcEnd = $end->copy()->setTimezone('UTC');

        $payments = Payment::query()
            ->whereBetween('paid_at', [$utcStart, $utcEnd])
            ->get(['method', 'amount', 'paid_at']);

        $purchasePaid = PurchasePayment::query()
            ->whereBetween('paid_at', [$utcStart, $utcEnd])
            ->get(['amount', 'paid_at']);

        $refunds = $this->returnsIn($start, $end);

        $cashIn = (int) $payments->sum('amount');
        $outPurchases = (int) $purchasePaid->sum('amount');
        $outRefunds = (int) $refunds->sum('total_refund');
        $cashOut = $outPurchases + $outRefunds;

        $opening = (int) Payment::query()->where('paid_at', '<', $utcStart)->sum('amount')
            - (int) PurchasePayment::query()->where('paid_at', '<', $utcStart)->sum('amount')
            - (int) SaleReturn::query()->where('created_at', '<', $utcStart)->sum('total_refund');

        $byMethod = array_values($payments->groupBy('method')->map(
            fn ($group, $method): array => ['method' => (string) $method, 'amount' => (int) $group->sum('amount')]
        )->all());

        $payByDay = $payments->groupBy(fn ($p) => $p->paid_at->setTimezone($tz)->toDateString());
        $purByDay = $purchasePaid->groupBy(fn ($p) => $p->paid_at->setTimezone($tz)->toDateString());
        $refByDay = $refunds->groupBy(fn ($r) => $r->created_at->setTimezone($tz)->toDateString());

        $daily = [];

        for ($day = $start->copy()->startOfDay(); $day->lte($end); $day = $day->copy()->addDay()) {
            $key = $day->toDateString();
            $in = (int) ($payByDay->get($key, collect())->sum('amount'));
            $out = (int) ($purByDay->get($key, collect())->sum('amount'))
                + (int) ($refByDay->get($key, collect())->sum('total_refund'));

            $daily[] = [
                'date' => $key,
                'label' => $day->isoFormat('D MMM'),
                'in' => $in,
                'out' => $out,
                'net' => $in - $out,
            ];
        }

        return [
            'opening_balance' => $opening,
            'cash_in' => $cashIn,
            'cash_in_by_method' => $byMethod,
            'cash_out_purchases' => $outPurchases,
            'cash_out_refunds' => $outRefunds,
            'cash_out' => $cashOut,
            'net_flow' => $cashIn - $cashOut,
            'closing_balance' => $opening + $cashIn - $cashOut,
            'daily' => $daily,
        ];
    }

    /**
     * @return Collection<int, Sale>
     */
    private function salesIn(CarbonInterface $start, CarbonInterface $end): Collection
    {
        return Sale::query()
            ->whereIn('status', ['completed', 'partial_refund'])
            ->whereBetween('completed_at', [$start->copy()->setTimezone('UTC'), $end->copy()->setTimezone('UTC')])
            ->get(['id', 'grand_total', 'discount_total', 'completed_at']);
    }

    /**
     * @return Collection<int, SaleReturn>
     */
    private function returnsIn(CarbonInterface $start, CarbonInterface $end): Collection
    {
        return SaleReturn::query()
            ->whereBetween('created_at', [$start->copy()->setTimezone('UTC'), $end->copy()->setTimezone('UTC')])
            ->get(['total_refund', 'created_at']);
    }

    /**
     * Returned items with their parent cost snapshot and product.
     *
     * @return Collection<int, SaleReturnItem>
     */
    private function returnItemsIn(CarbonInterface $start, CarbonInterface $end): Collection
    {
        return SaleReturnItem::query()
            ->with(['saleItem:id,cost_price', 'product:id,name,sku'])
            ->whereHas('saleReturn', fn ($query) => $query
                ->whereBetween('created_at', [$start->copy()->setTimezone('UTC'), $end->copy()->setTimezone('UTC')]))
            ->get(['id', 'sale_return_id', 'sale_item_id', 'product_id', 'qty', 'refund_amount']);
    }

    /**
     * HPP reversed by returns in a range, valued at the original cost.
     */
    private function returnedCogs(CarbonInterface $start, CarbonInterface $end): int
    {
        $total = 0.0;

        foreach ($this->returnItemsIn($start, $end) as $item) {
            $total += (float) $item->qty * ($item->saleItem->cost_price ?? 0);
        }

        return (int) round($total);
    }
}
