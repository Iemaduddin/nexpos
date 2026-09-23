<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BusinessSetting extends Model
{
    /** @var list<string> */
    public const DEFAULT_PAYMENT_METHODS = [
        'cash',
        'qris',
        'transfer',
        'edc_debit',
        'edc_credit',
        'ewallet',
    ];

    /** @var list<string> */
    protected $fillable = [
        'name',
        'address',
        'phone',
        'email',
        'logo_path',
        'currency',
        'timezone',
        'default_tax_rate',
        'receipt_header',
        'receipt_footer',
        'enabled_payment_methods',
        'rounding_unit',
        'max_discount_percent',
        'default_low_stock_threshold',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'default_tax_rate' => 'decimal:2',
            'enabled_payment_methods' => 'array',
            'rounding_unit' => 'integer',
            'max_discount_percent' => 'decimal:2',
            'default_low_stock_threshold' => 'integer',
        ];
    }

    /**
     * Return configured payment methods, falling back to every supported method.
     *
     * @return list<string>
     */
    public function enabledPaymentMethods(): array
    {
        $methods = $this->enabled_payment_methods;

        if (! is_array($methods) || $methods === []) {
            return self::DEFAULT_PAYMENT_METHODS;
        }

        return array_values(array_intersect($methods, self::DEFAULT_PAYMENT_METHODS));
    }
}
