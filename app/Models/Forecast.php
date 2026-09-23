<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Forecast extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'product_id',
        'store_id',
        'target_date',
        'horizon_days',
        'predicted_qty',
        'lower_qty',
        'upper_qty',
        'model',
        'confidence',
        'model_version',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'target_date' => 'date',
            'predicted_qty' => 'decimal:2',
            'lower_qty' => 'decimal:2',
            'upper_qty' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
