<?php

namespace App\Http\Requests\Purchase;

use App\Models\Purchase;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RecordPaymentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can(
            'pay',
            $this->route('purchase') instanceof Purchase
                ? $this->route('purchase')
                : Purchase::class
        );
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Purchase|null $purchase */
        $purchase = $this->route('purchase');
        $remaining = $purchase ? $purchase->grand_total - $purchase->paid_amount : 0;

        return [
            'amount' => ['required', 'integer', 'min:1', 'max:'.$remaining],
        ];
    }
}
