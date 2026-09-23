<?php

namespace App\Http\Requests\StockAdjustment;

use App\Models\Product;
use App\Models\StockAdjustment;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreStockAdjustmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('create', StockAdjustment::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'store_id' => ['required', 'integer', 'exists:stores,id'],
            'type' => ['required', 'string', Rule::in(['correction', 'damaged', 'lost', 'found'])],
            'reason' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'items.*.qty_actual' => ['required', 'numeric', 'min:0', 'max:999999'],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            foreach ($this->input('items', []) as $i => $item) {
                if (! is_array($item) || empty($item['product_id'])) {
                    continue;
                }

                $product = Product::query()->withCount('variants')->find((int) $item['product_id']);

                if ($product && $product->variants_count > 0 && empty($item['variant_id'])) {
                    $validator->errors()->add("items.{$i}.variant_id", 'Varian wajib dipilih untuk produk ini.');
                }

                if ($product && ! empty($item['variant_id']) && ! $product->variants()->where('id', $item['variant_id'])->exists()) {
                    $validator->errors()->add("items.{$i}.variant_id", 'Varian tidak sesuai dengan produk.');
                }
            }
        });
    }
}
