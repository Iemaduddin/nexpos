<?php

namespace App\Http\Requests\Purchase;

use App\Models\Purchase;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ReceivePurchaseRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can(
            'receive',
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
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer', 'exists:purchase_items,id'],
            'items.*.qty' => ['required', 'integer', 'min:0'],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var Purchase|null $purchase */
            $purchase = $this->route('purchase');

            if (! $purchase) {
                return;
            }

            if (! in_array($purchase->status, ['ordered', 'partial'], true)) {
                $validator->errors()->add('status', 'Hanya pembelian berstatus Dipesan yang dapat diterima.');

                return;
            }

            foreach ($this->input('items', []) as $i => $row) {
                if (! is_array($row) || empty($row['id'])) {
                    continue;
                }

                $item = $purchase->items()->find((int) $row['id']);

                if (! $item) {
                    $validator->errors()->add("items.{$i}.id", 'Item tidak termasuk dalam pembelian ini.');

                    continue;
                }

                $remaining = $item->qty_ordered - $item->qty_received;

                if (($row['qty'] ?? 0) > $remaining) {
                    $validator->errors()->add(
                        "items.{$i}.qty",
                        "Melebihi sisa {$remaining} yang belum diterima."
                    );
                }
            }
        });
    }
}
