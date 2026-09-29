<?php

use App\Support\Money;

test('line gross rounds qty times price to rupiah', function () {
    expect(Money::lineGross(2, 30000))->toBe(60000);
    expect(Money::lineGross(1.5, 10000))->toBe(15000);
    expect(Money::lineGross(0.333, 1000))->toBe(333);
});

test('discount never exceeds its base', function () {
    expect(Money::capDiscount(5000, 3000))->toBe(3000);
    expect(Money::capDiscount(-100, 3000))->toBe(0);
    expect(Money::capDiscount(1000, 0))->toBe(0);
});

test('max discount follows the percent cap', function () {
    expect(Money::maxDiscount(100000, 100))->toBe(100000);
    expect(Money::maxDiscount(100000, 10))->toBe(10000);
    expect(Money::maxDiscount(999, 10))->toBe(99);
});

test('tax floors to rupiah and ignores non-positive input', function () {
    expect(Money::tax(100000, 11))->toBe(11000);
    expect(Money::tax(999, 10))->toBe(99);
    expect(Money::tax(0, 11))->toBe(0);
    expect(Money::tax(100000, 0))->toBe(0);
});

test('rounding lifts the total to the currency unit', function () {
    expect(Money::roundTotal(12300, 1))->toBe(12300);
    expect(Money::roundTotal(12300, 500))->toBe(12500);
    expect(Money::roundTotal(12500, 500))->toBe(12500);
});

test('rupiah formatting matches indonesian convention', function () {
    expect(Money::format(15000))->toBe('Rp 15.000');
    expect(Money::formatQty(500.500))->toBe('500.5');
});
