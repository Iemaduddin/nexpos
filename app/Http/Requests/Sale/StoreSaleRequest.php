<?php

namespace App\Http\Requests\Sale;

use App\Models\BusinessSetting;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreSaleRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('create', Sale::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $paymentMethods = BusinessSetting::first()?->enabledPaymentMethods()
            ?? BusinessSetting::DEFAULT_PAYMENT_METHODS;

        return [
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'discount_total' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'items.*.qty' => ['required', 'numeric', 'gt:0', 'max:999999'],
            'items.*.discount' => ['nullable', 'integer', 'min:0'],
            'payments' => ['required', 'array', 'min:1'],
            'payments.*.method' => ['required', 'string', Rule::in($paymentMethods)],
            'payments.*.amount' => ['required', 'integer', 'min:1'],
            'payments.*.reference_no' => ['nullable', 'string', 'max:100'],
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

                if (! $product?->is_active) {
                    $validator->errors()->add("items.{$i}.product_id", 'Produk tidak aktif.');

                    continue;
                }

                if ($product->variants_count > 0 && empty($item['variant_id'])) {
                    $validator->errors()->add("items.{$i}.variant_id", 'Varian wajib dipilih untuk produk ini.');
                }

                if (! empty($item['variant_id']) && ! $product->variants()->where('id', $item['variant_id'])->exists()) {
                    $validator->errors()->add("items.{$i}.variant_id", 'Varian tidak sesuai dengan produk.');
                }
            }
        });
    }
}
