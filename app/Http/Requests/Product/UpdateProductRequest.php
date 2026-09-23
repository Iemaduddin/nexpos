<?php

namespace App\Http\Requests\Product;

use App\Models\Product;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can(
            'update',
            $this->route('product') instanceof Product
                ? $this->route('product')
                : Product::class
        );
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if (filled($this->input('name')) && blank($this->input('slug'))) {
            $this->merge(['slug' => Str::slug($this->input('name'))]);
        }

        if (blank($this->input('barcode'))) {
            $this->merge(['barcode' => null]);
        }

        $variants = $this->input('variants', []);
        if (is_array($variants)) {
            foreach ($variants as $i => $variant) {
                if (is_array($variant) && blank($variant['barcode'] ?? null)) {
                    $variants[$i]['barcode'] = null;
                }
            }
            $this->merge(['variants' => $variants]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Product $product */
        $product = $this->route('product');
        $ownVariantIds = $product->variants()->pluck('id')->all();

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', Rule::unique('products', 'slug')->ignore($product->id)],
            'sku' => ['required', 'string', 'max:50', Rule::unique('products', 'sku')->ignore($product->id)],
            'barcode' => ['nullable', 'string', 'max:100', Rule::unique('products', 'barcode')->ignore($product->id)],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'unit_id' => ['required', 'integer', 'exists:units,id'],
            'cost_price' => ['required', 'integer', 'min:0'],
            'selling_price' => ['required', 'integer', 'min:0'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'track_inventory' => ['sometimes', 'boolean'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'image', 'max:2048'],
            'is_active' => ['sometimes', 'boolean'],
            'variants' => ['nullable', 'array'],
            'variants.*.id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'variants.*.name' => ['required', 'string', 'max:255'],
            'variants.*.sku' => ['required', 'string', 'max:50', 'distinct', Rule::unique('product_variants', 'sku')->whereNotIn('id', $ownVariantIds)],
            'variants.*.barcode' => ['nullable', 'string', 'max:100', 'distinct', Rule::unique('product_variants', 'barcode')->whereNotIn('id', $ownVariantIds)],
            'variants.*.cost_price' => ['required', 'integer', 'min:0'],
            'variants.*.selling_price' => ['required', 'integer', 'min:0'],
            'variants.*.low_stock_threshold' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
