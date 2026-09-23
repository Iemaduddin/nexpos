<?php

namespace App\Http\Requests\SaleReturn;

use App\Models\Sale;
use App\Models\SaleReturn;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreSaleReturnRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('create', [SaleReturn::class, $this->route('sale')]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.sale_item_id' => ['required', 'integer', 'exists:sale_items,id'],
            'items.*.qty' => ['required', 'numeric', 'gt:0'],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var Sale|null $sale */
            $sale = $this->route('sale');

            if (! $sale) {
                return;
            }

            if (! in_array($sale->status, ['completed', 'partial_refund'], true)) {
                $validator->errors()->add('sale', 'Hanya transaksi selesai yang dapat diretur.');

                return;
            }

            foreach ($this->input('items', []) as $i => $row) {
                if (! is_array($row) || empty($row['sale_item_id'])) {
                    continue;
                }

                $item = $sale->items()->find((int) $row['sale_item_id']);

                if (! $item) {
                    $validator->errors()->add("items.{$i}.sale_item_id", 'Item tidak termasuk dalam transaksi ini.');

                    continue;
                }

                $already = $sale->returns()->with('items')->get()
                    ->flatMap->items
                    ->where('sale_item_id', $item->id)
                    ->sum('qty');

                if (($row['qty'] ?? 0) > ($item->qty - $already)) {
                    $validator->errors()->add(
                        "items.{$i}.qty",
                        "Melebihi sisa {$item->qty} yang dapat diretur."
                    );
                }
            }
        });
    }
}
