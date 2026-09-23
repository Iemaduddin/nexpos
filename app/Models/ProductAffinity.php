<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductAffinity extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'product_id',
        'with_product_id',
        'support',
        'confidence',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'support' => 'decimal:4',
            'confidence' => 'decimal:4',
        ];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function withProduct(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'with_product_id');
    }
}
