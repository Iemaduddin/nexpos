<?php

namespace App\Http\Requests\User;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UpdateUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can(
            'update',
            $this->route('user') instanceof User
                ? $this->route('user')
                : User::class
        );
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var User $target */
        $target = $this->route('user');

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($target->id)],
            'password' => ['nullable', 'string', 'min:8', 'max:72'],
            'role' => ['required', 'string', Rule::exists('roles', 'name')],
            'store_id' => ['nullable', 'integer', 'exists:stores,id'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Ensure the role exists in the web guard.
     */
    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function (\Illuminate\Validation\Validator $validator): void {
            $role = $this->input('role');

            if (is_string($role) && ! Role::where('name', $role)->where('guard_name', 'web')->exists()) {
                $validator->errors()->add('role', 'Peran tidak valid.');
            }
        });
    }
}
