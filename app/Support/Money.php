<?php

namespace App\Support;

/**
 * Single source of truth for Rupiah money math.
 *
 * All amounts are integer minor units (Rupiah, no cents).
 * Never use float for money; quantities stay float/decimal separately.
 */
final class Money
{
    /**
     * Line gross: qty * unit price, rounded to Rupiah.
     */
    public static function lineGross(float $qty, int $unitPrice): int
    {
        return (int) round($qty * $unitPrice);
    }

    /**
     * Cap a discount so it never exceeds the base amount.
     */
    public static function capDiscount(int $discount, int $base): int
    {
        if ($base <= 0) {
            return 0;
        }

        return max(0, min($discount, $base));
    }

    /**
     * Max allowed discount from a percent cap (e.g. 100 = no cap beyond gross).
     */
    public static function maxDiscount(int $grossSubtotal, float $maxPercent): int
    {
        return (int) floor($grossSubtotal * max(0, $maxPercent) / 100);
    }

    /**
     * Tax with floor to Rupiah (consistent with POS & reports).
     */
    public static function tax(int $taxable, float $rate): int
    {
        if ($taxable <= 0 || $rate <= 0) {
            return 0;
        }

        return (int) floor($taxable * $rate / 100);
    }

    /**
     * Round payable up to the configured currency unit (e.g. 500).
     */
    public static function roundTotal(int $amount, int $unit): int
    {
        if ($unit <= 1) {
            return $amount;
        }

        return (int) (ceil($amount / $unit) * $unit);
    }

    public static function format(int $value): string
    {
        return 'Rp '.number_format($value, 0, ',', '.');
    }

    public static function formatQty(float $qty): string
    {
        $text = rtrim(rtrim(number_format($qty, 3, '.', ''), '0'), '.');

        return $text === '' ? '0' : $text;
    }
}
