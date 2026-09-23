<?php

namespace App\AI\Tools;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Base class for AI business tools.
 *
 * Tools are the ONLY way the model may access business data.
 * Each tool validates its own arguments and authorization.
 */
abstract class AiTool
{
    abstract public function name(): string;

    abstract public function description(): string;

    /**
     * JSON Schema for the tool parameters.
     *
     * @return array<string, mixed>
     */
    abstract public function parameters(): array;

    /**
     * Required parameter names.
     *
     * @return list<string>
     */
    abstract public function required(): array;

    /**
     * Laravel validation rules for the tool arguments.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    abstract public function rules(): array;

    abstract public function authorize(User $user): bool;

    /**
     * Execute with already-validated arguments.
     *
     * @param  array<string, mixed>  $args
     * @return array<string, mixed> Compact, structured result.
     */
    abstract public function execute(User $user, array $args): array;

    /**
     * Ollama tool definition.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Ollama rejects empty "required" arrays, so omit the key instead.
        // An empty PHP array encodes as [] but Ollama needs {} for properties.
        $parameters = [
            'type' => 'object',
            'properties' => $this->parameters() === [] ? new \stdClass : $this->parameters(),
        ];

        if ($this->required() !== []) {
            $parameters['required'] = $this->required();
        }

        return [
            'type' => 'function',
            'function' => [
                'name' => $this->name(),
                'description' => $this->description(),
                'parameters' => $parameters,
            ],
        ];
    }
}
