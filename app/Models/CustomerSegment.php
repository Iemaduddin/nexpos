<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerSegment extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'customer_id',
        'segment',
        'recency_days',
        'frequency',
        'monetary',
    ];

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
