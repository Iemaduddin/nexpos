<?php

namespace App\AI;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Natural-language interface over deterministic business tools.
 *
 * The model only reasons and selects tools. All numbers come from
 * tool results; the model must never invent business data.
 */
class NEXPOSAssistant
{
    private const MAX_TOOL_ROUNDS = 5;

    /**
     * Keywords hinting at analytical questions that deserve the full model.
     *
     * @var list<string>
     */
    private const ANALYTICAL_KEYWORDS = [
        'kenapa',
        'mengapa',
        'sebab',
        'penyebab',
        'analis',
        'strategi',
        'banding',
        'bagaimana',
        'prediksi',
        'proyeksi',
        'insight',
        'evaluasi',
        'rekomendasi',
        'saran',
        'tren',
        'trend',
        'jelaskan',
        'uraikan',
        'simpulkan',
    ];

    private const SYSTEM_PROMPT = <<<'PROMPT'
Kamu adalah asisten bisnis NEXPOS, aplikasi kasir (POS) dan analitik untuk satu toko di Indonesia.

Aturan wajib:
- Selalu jawab dalam Bahasa Indonesia yang natural, ringkas, dan profesional.
- Untuk pertanyaan tentang omzet, penjualan, transaksi, produk terlaris, atau stok, WAJIB panggil tool yang tersedia. Jangan pernah mengarang angka.
- Uang dalam Rupiah ditulis seperti Rp 15.000.
- Jika data tidak tersedia atau tool gagal, katakan "Data tersebut belum tersedia." Jangan mengarang.
- Jangan ulangi pertanyaan pengguna. Langsung jawab.
- Jangan sebutkan nama tool, parameter, atau proses internal kepada pengguna.
PROMPT;

    public function __construct(
        private readonly OllamaClient $client,
        private readonly ToolRegistry $registry,
        private readonly FastPath $fastPath,
    ) {}

    /**
     * @param  list<array{role: string, content: string}>  $history
     * @return array{reply: string}
     */
    public function chat(User $user, string $message, array $history = []): array
    {
        $messages = [['role' => 'system', 'content' => self::SYSTEM_PROMPT]];

        foreach (array_slice($history, -10) as $turn) {
            if ($turn['role'] === 'user' || $turn['role'] === 'assistant') {
                $messages[] = ['role' => $turn['role'], 'content' => $turn['content']];
            }
        }

        $messages[] = ['role' => 'user', 'content' => $message];

        $fast = $this->fastPath->answer($user, $message);

        if ($fast !== null) {
            return $fast;
        }

        try {
            return ['reply' => $this->runLoop($user, $messages, $this->selectModel($message))];
        } catch (Throwable $e) {
            Log::warning('NEXPOS AI gagal.', ['error' => $e->getMessage()]);

            return ['reply' => 'Maaf, layanan AI sedang tidak tersedia. Silakan coba lagi.'];
        }
    }

    /**
     * Streaming variant: emits status/token events while reasoning.
     *
     * The $emit callback receives ['status' => ...] or ['token' => ...].
     * Returns the full cleaned reply for persistence.
     *
     * @param  list<array{role: string, content: string}>  $history
     * @param  callable(array{status?: string, token?: string}): void  $emit
     * @return array{reply: string}
     */
    public function chatStream(User $user, string $message, array $history, callable $emit): array
    {
        $messages = [['role' => 'system', 'content' => self::SYSTEM_PROMPT]];

        foreach (array_slice($history, -10) as $turn) {
            if ($turn['role'] === 'user' || $turn['role'] === 'assistant') {
                $messages[] = ['role' => $turn['role'], 'content' => $turn['content']];
            }
        }

        $messages[] = ['role' => 'user', 'content' => $message];
        $model = $this->selectModel($message);

        $fast = $this->fastPath->answer($user, $message);

        if ($fast !== null) {
            $emit(['token' => $fast['reply']]);

            return $fast;
        }

        try {
            $emit(['status' => 'Memahami pertanyaan...']);

            return ['reply' => $this->runLoopStream($user, $messages, $model, $emit)];
        } catch (Throwable $e) {
            Log::warning('NEXPOS AI gagal.', ['error' => $e->getMessage()]);
            $emit(['error' => 'Maaf, layanan AI sedang tidak tersedia. Silakan coba lagi.']);

            return ['reply' => 'Maaf, layanan AI sedang tidak tersedia. Silakan coba lagi.'];
        }
    }

    /**
     * Pick the fast model for simple lookups, the full model for analysis.
     */
    public function selectModel(string $message): string
    {
        $lower = mb_strtolower($message);

        foreach (self::ANALYTICAL_KEYWORDS as $keyword) {
            if (str_contains($lower, $keyword)) {
                return (string) config('services.ollama.model', 'qwen3:8b');
            }
        }

        return (string) config('services.ollama.fast_model', 'qwen3:4b');
    }

    /**
     * @param  list<array<string, mixed>>  $messages
     */
    private function runLoop(User $user, array $messages, string $model): string
    {
        $tools = $this->registry->definitions();

        for ($round = 0; $round < self::MAX_TOOL_ROUNDS; $round++) {
            $message = $this->client->chat($messages, $tools, false, $model);
            $toolCalls = $message['tool_calls'] ?? [];

            if ($toolCalls === []) {
                $content = $this->cleanReply((string) ($message['content'] ?? ''));

                return $content !== '' ? $content : 'Data tersebut belum tersedia.';
            }

            $messages[] = $message;

            foreach ($toolCalls as $call) {
                $name = (string) ($call['function']['name'] ?? '');
                $args = $call['function']['arguments'] ?? [];

                if (is_string($args)) {
                    $args = json_decode($args, true) ?? [];
                }

                try {
                    $result = $this->registry->run($user, $name, is_array($args) ? $args : []);
                    $messages[] = [
                        'role' => 'tool',
                        'content' => json_encode($result, JSON_UNESCAPED_UNICODE),
                    ];
                } catch (AiException $e) {
                    $messages[] = [
                        'role' => 'tool',
                        'content' => json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE),
                    ];
                }
            }
        }

        return 'Maaf, permintaan tidak dapat diproses saat ini. Silakan coba lagi.';
    }

    /**
     * @param  list<array<string, mixed>>  $messages
     * @param  callable(array{status?: string, token?: string}): void  $emit
     */
    private function runLoopStream(User $user, array $messages, string $model, callable $emit): string
    {
        $tools = $this->registry->definitions();

        for ($round = 0; $round < self::MAX_TOOL_ROUNDS; $round++) {
            $final = $this->client->chatStream($messages, $tools, function (string $token) use ($emit): void {
                $emit(['token' => $token]);
            }, $model);

            $toolCalls = $final['tool_calls'] ?? [];

            if ($toolCalls === []) {
                $content = $this->cleanReply((string) ($final['content'] ?? ''));

                return $content !== '' ? $content : 'Data tersebut belum tersedia.';
            }

            $messages[] = [
                'role' => 'assistant',
                'content' => (string) ($final['content'] ?? ''),
                'tool_calls' => $toolCalls,
            ];

            $emit(['status' => 'Mencari data...']);

            foreach ($toolCalls as $call) {
                $name = (string) ($call['function']['name'] ?? '');
                $args = $call['function']['arguments'] ?? [];

                if (is_string($args)) {
                    $args = json_decode($args, true) ?? [];
                }

                try {
                    $result = $this->registry->run($user, $name, is_array($args) ? $args : []);
                    $messages[] = [
                        'role' => 'tool',
                        'content' => json_encode($result, JSON_UNESCAPED_UNICODE),
                    ];
                } catch (AiException $e) {
                    $messages[] = [
                        'role' => 'tool',
                        'content' => json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE),
                    ];
                }
            }
        }

        return 'Maaf, permintaan tidak dapat diproses saat ini. Silakan coba lagi.';
    }

    /**
     * Remove leaked thinking blocks so users only see the final answer.
     *
     * Some Ollama versions drop the opening tag but keep the content and
     * the closing tag, so handle both complete pairs and leftovers.
     */
    private function cleanReply(string $content): string
    {
        $cleaned = preg_replace('/<think>.*?<\/think>/s', '', $content);
        $cleaned = is_string($cleaned) ? $cleaned : $content;

        $closer = strpos($cleaned, '</think>');

        if ($closer !== false) {
            $cleaned = substr($cleaned, $closer + strlen('</think>'));
        }

        return trim(str_replace('<think>', '', $cleaned));
    }
}
