<?php

namespace App\Http\Requests\Unit;

use App\Models\Unit;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUnitRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can(
            'update',
            $this->route('unit') instanceof Unit
                ? $this->route('unit')
                : Unit::class
        );
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Unit $unit */
        $unit = $this->route('unit');

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('units', 'name')->ignore($unit->id)],
            'symbol' => ['required', 'string', 'max:20', Rule::unique('units', 'symbol')->ignore($unit->id)],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
