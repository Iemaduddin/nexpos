<?php

namespace App\Http\Requests\StockAdjustment;

use App\Models\StockAdjustment;

class UpdateStockAdjustmentRequest extends StoreStockAdjustmentRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can(
            'update',
            $this->route('adjustment') instanceof StockAdjustment
                ? $this->route('adjustment')
                : StockAdjustment::class
        );
    }
}
