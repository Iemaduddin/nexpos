<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Customer extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'code',
        'name',
        'phone',
        'email',
        'address',
        'birthdate',
        'loyalty_points',
        'total_spent',
        'transaction_count',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'birthdate' => 'date',
            'is_active' => 'boolean',
        ];
    }

    /** @return HasMany<Sale, $this> */
    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    /** @return HasOne<CustomerSegment, $this> */
    public function segment(): HasOne
    {
        return $this->hasOne(CustomerSegment::class);
    }
}
