<?php

namespace App\Http\Requests\Purchase;

use App\Models\Purchase;

class UpdatePurchaseRequest extends StorePurchaseRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can(
            'update',
            $this->route('purchase') instanceof Purchase
                ? $this->route('purchase')
                : Purchase::class
        );
    }
}
