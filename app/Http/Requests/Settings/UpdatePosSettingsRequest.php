<?php

namespace App\Http\Requests\Settings;

use App\Models\BusinessSetting;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePosSettingsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('settings.manage') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'enabled_payment_methods' => ['required', 'array', 'min:1'],
            'enabled_payment_methods.*' => [
                'string',
                Rule::in(BusinessSetting::DEFAULT_PAYMENT_METHODS),
            ],
            'rounding_unit' => ['required', 'integer', Rule::in([1, 10, 50, 100, 500, 1000])],
            'max_discount_percent' => ['required', 'numeric', 'min:0', 'max:100'],
        ];
    }
}
