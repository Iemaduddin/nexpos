<?php

namespace App\AI;

use GuzzleHttp\Client;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin HTTP client for the local Ollama server.
 *
 * All model access goes through this class; controllers and tools
 * must never call Ollama directly.
 */
class OllamaClient
{
    /**
     * Send a chat request with optional tool definitions.
     *
     * Thinking stays enabled so reasoning lands in the separate "thinking"
     * field (which we ignore) instead of leaking into the answer content.
     * Disabling it makes Qwen3 reason inline, which is slower to read.
     *
     * @param  list<array<string, mixed>>  $messages
     * @param  list<array<string, mixed>>  $tools
     * @return array<string, mixed> The response message (role, content, tool_calls).
     *
     * @throws AiException
     */
    public function chat(array $messages, array $tools = [], bool $think = true, ?string $model = null): array
    {
        $model ??= (string) config('services.ollama.model', 'qwen3:8b');

        $response = $this->post($messages, $tools, $think, $model);

        // Graceful degradation: the full model may not be pulled on this
        // machine (e.g. only qwen3:4b installed). Fall back instead of
        // refusing every analytical question.
        if ($response->status() === 404) {
            $fast = (string) config('services.ollama.fast_model', 'qwen3:4b');

            if ($fast !== $model) {
                Log::warning('Model AI utama tidak ditemukan, memakai model cepat.', ['model' => $model]);
                $response = $this->post($messages, $tools, $think, $fast);
            }
        }

        if (! $response->successful()) {
            throw new AiException('Layanan AI tidak merespons dengan baik.');
        }

        $message = $response->json('message');

        if (! is_array($message)) {
            throw new AiException('Respons AI tidak valid.');
        }

        return $message;
    }

    /**
     * @param  list<array<string, mixed>>  $messages
     * @param  list<array<string, mixed>>  $tools
     */
    private function post(array $messages, array $tools, bool $think, string $model): Response
    {
        return Http::baseUrl((string) config('services.ollama.url'))
            ->timeout((int) config('services.ollama.timeout', 180))
            ->connectTimeout(5)
            ->post('/api/chat', [
                'model' => $model,
                'messages' => $messages,
                'tools' => $tools === [] ? null : $tools,
                'think' => $think,
                'stream' => false,
                'options' => [
                    'temperature' => (float) config('services.ollama.temperature', 0.2),
                    'top_p' => 0.8,
                    'num_ctx' => 4096,
                ],
            ]);
    }

    /**
     * Stream a chat completion, invoking the callback per content token.
     *
     * Reads the NDJSON stream incrementally so callers can flush early.
     * Returns the final message (content accumulated, tool calls if any).
     *
     * @param  list<array<string, mixed>>  $messages
     * @param  list<array<string, mixed>>  $tools
     * @param  callable(string): void  $onToken
     * @return array<string, mixed>
     *
     * @throws AiException
     */
    public function chatStream(array $messages, array $tools, callable $onToken, ?string $model = null): array
    {
        $model ??= (string) config('services.ollama.model', 'qwen3:8b');

        $client = new Client([
            'base_uri' => (string) config('services.ollama.url'),
            'timeout' => (int) config('services.ollama.timeout', 180),
            'connect_timeout' => 5,
        ]);

        $payload = fn (string $name): array => [
            'headers' => ['Accept' => 'application/x-ndjson'],
            'json' => [
                'model' => $name,
                'messages' => $messages,
                'tools' => $tools === [] ? null : $tools,
                'think' => true,
                'stream' => true,
                'options' => [
                    'temperature' => (float) config('services.ollama.temperature', 0.2),
                    'top_p' => 0.8,
                    'num_ctx' => 4096,
                ],
            ],
            'stream' => true,
        ];

        try {
            $response = $client->post('/api/chat', $payload($model));

            if ($response->getStatusCode() === 404) {
                $fast = (string) config('services.ollama.fast_model', 'qwen3:4b');

                if ($fast !== $model) {
                    Log::warning('Model AI utama tidak ditemukan, memakai model cepat.', ['model' => $model]);
                    $response = $client->post('/api/chat', $payload($fast));
                }
            }
        } catch (\Throwable $e) {
            throw new AiException('Layanan AI tidak merespons dengan baik.', previous: $e);
        }

        if ($response->getStatusCode() !== 200) {
            throw new AiException('Layanan AI tidak merespons dengan baik.');
        }

        $buffer = '';
        $content = '';
        $toolCalls = [];
        $body = $response->getBody();

        $emit = function (string $line) use ($onToken, &$content, &$toolCalls): void {
            $line = trim($line);

            if ($line === '') {
                return;
            }

            $data = json_decode($line, true);

            if (! is_array($data)) {
                return;
            }

            $token = $data['message']['content'] ?? null;

            if (is_string($token) && $token !== '') {
                $content .= $token;
                $onToken($token);
            }

            $calls = $data['message']['tool_calls'] ?? null;

            if (is_array($calls) && $calls !== []) {
                $toolCalls = $calls;
            }
        };

        while (! $body->eof()) {
            $buffer .= $body->read(4096);

            while (($pos = strpos($buffer, "\n")) !== false) {
                $emit(substr($buffer, 0, $pos));
                $buffer = substr($buffer, $pos + 1);
            }
        }

        if (trim($buffer) !== '') {
            $emit($buffer);
        }

        return ['content' => $content, 'tool_calls' => $toolCalls];
    }
}
