<?php

namespace App\AI;

use App\AI\Tools\AiTool;
use App\AI\Tools\GetAnomalies;
use App\AI\Tools\GetCashFlow;
use App\AI\Tools\GetCogsSummary;
use App\AI\Tools\GetCustomerSegments;
use App\AI\Tools\GetCustomerSummary;
use App\AI\Tools\GetForecast;
use App\AI\Tools\GetInventorySummary;
use App\AI\Tools\GetLowStockProducts;
use App\AI\Tools\GetProductPerformance;
use App\AI\Tools\GetProfitSummary;
use App\AI\Tools\GetPurchaseSummary;
use App\AI\Tools\GetRecommendations;
use App\AI\Tools\GetSalesComparison;
use App\AI\Tools\GetSalesSummary;
use App\AI\Tools\GetStockMovements;
use App\AI\Tools\GetTopCustomers;
use App\AI\Tools\GetTopProducts;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Validator;

/**
 * Central registry of executable AI tools.
 *
 * Only tools listed here may run. The model output is untrusted input:
 * names are allow-listed, arguments validated, authorization enforced.
 */
class ToolRegistry
{
    /**
     * @var array<string, class-string<AiTool>>
     */
    private const TOOLS = [
        'get_sales_summary' => GetSalesSummary::class,
        'get_sales_comparison' => GetSalesComparison::class,
        'get_profit_summary' => GetProfitSummary::class,
        'get_cogs_summary' => GetCogsSummary::class,
        'get_cash_flow' => GetCashFlow::class,
        'get_top_products' => GetTopProducts::class,
        'get_product_performance' => GetProductPerformance::class,
        'get_low_stock_products' => GetLowStockProducts::class,
        'get_inventory_summary' => GetInventorySummary::class,
        'get_stock_movements' => GetStockMovements::class,
        'get_customer_summary' => GetCustomerSummary::class,
        'get_top_customers' => GetTopCustomers::class,
        'get_purchase_summary' => GetPurchaseSummary::class,
        'get_forecast' => GetForecast::class,
        'get_anomalies' => GetAnomalies::class,
        'get_recommendations' => GetRecommendations::class,
        'get_customer_segments' => GetCustomerSegments::class,
    ];

    /**
     * @return list<array<string, mixed>>
     */
    public function definitions(): array
    {
        $definitions = [];

        foreach (self::TOOLS as $class) {
            $definitions[] = $this->make($class)->definition();
        }

        return $definitions;
    }

    public function has(string $name): bool
    {
        return isset(self::TOOLS[$name]);
    }

    /**
     * @param  class-string<AiTool>  $class
     */
    private function make(string $class): AiTool
    {
        $tool = app($class);

        if (! $tool instanceof AiTool) {
            throw new AiException("Tool {$class} tidak valid.");
        }

        return $tool;
    }

    /**
     * Validate, authorize, and execute a tool call.
     *
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     *
     * @throws AiException
     */
    public function run(User $user, string $name, array $args): array
    {
        if (! $this->has($name)) {
            $this->audit($user, $name, $args, 'rejected');
            throw new AiException("Tool {$name} tidak tersedia.");
        }

        $tool = $this->make(self::TOOLS[$name]);

        if (! $tool->authorize($user)) {
            $this->audit($user, $name, $args, 'unauthorized');
            throw new AiException('Anda tidak memiliki izin untuk mengakses data ini.');
        }

        $validator = Validator::make($args, $tool->rules());

        if ($validator->fails()) {
            $this->audit($user, $name, $args, 'invalid');
            throw new AiException('Parameter tool tidak valid.');
        }

        $result = $tool->execute($user, $validator->validated());

        $this->audit($user, $name, $validator->validated(), 'ok');

        return $result;
    }

    /**
     * Record AI tool invocations. Audit must never break the chat flow.
     *
     * @param  array<string, mixed>  $args
     */
    private function audit(User $user, string $name, array $args, string $status): void
    {
        try {
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'ai.tool',
                'auditable_type' => null,
                'auditable_id' => null,
                'old_values' => null,
                'new_values' => ['tool' => $name, 'args' => $args, 'status' => $status],
                'ip' => request()->ip(),
                'user_agent' => substr((string) request()->userAgent(), 0, 500),
            ]);
        } catch (\Throwable) {
            // Never break AI answers because audit storage failed.
        }
    }
}
