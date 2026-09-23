<?php

namespace App\Http\Controllers;

use App\AI\DailyBriefing;
use App\AI\NEXPOSAssistant;
use App\Models\AiConversation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AiChatController extends Controller
{
    /**
     * Show the AI assistant chat page.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('ai/index', [
            'conversations' => $this->conversationList($request->user()->id),
        ]);
    }

    /**
     * List the user's conversations, newest first.
     */
    public function conversations(Request $request): JsonResponse
    {
        return response()->json([
            'conversations' => $this->conversationList($request->user()->id),
        ]);
    }

    /**
     * Show one conversation with its messages.
     */
    public function show(Request $request, AiConversation $conversation): JsonResponse
    {
        $this->ensureOwner($request, $conversation);

        return response()->json([
            'conversation' => $conversation->only(['id', 'title', 'updated_at']),
            'messages' => $conversation->messages()->get(['role', 'content'])->all(),
        ]);
    }

    /**
     * Delete a conversation and its messages.
     */
    public function destroy(Request $request, AiConversation $conversation): JsonResponse
    {
        $this->ensureOwner($request, $conversation);

        $conversation->delete();

        return response()->json(['deleted' => true]);
    }

    /**
     * Answer a chat message via the assistant and persist the turn.
     */
    public function chat(Request $request, NEXPOSAssistant $assistant): JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'conversation_id' => ['nullable', 'integer', 'exists:ai_conversations,id'],
        ]);

        $user = $request->user();
        $conversation = null;

        if (! empty($validated['conversation_id'])) {
            $conversation = AiConversation::query()->findOrFail((int) $validated['conversation_id']);
            $this->ensureOwner($request, $conversation);
        }

        if ($conversation === null) {
            $conversation = AiConversation::create([
                'user_id' => $user->id,
                'title' => Str::limit($validated['message'], 80),
            ]);
        }

        $conversation->messages()->create([
            'role' => 'user',
            'content' => $validated['message'],
        ]);

        $stored = $conversation->messages()
            ->orderByDesc('id')
            ->limit(11)
            ->get(['role', 'content'])
            ->reverse()
            ->values();

        $history = [];

        foreach ($stored as $message) {
            $history[] = ['role' => $message->role, 'content' => $message->content];
        }

        // Drop the just-saved user message; the assistant adds it as the prompt.
        array_pop($history);

        $result = $assistant->chat($user, $validated['message'], $history);

        $conversation->messages()->create([
            'role' => 'assistant',
            'content' => $result['reply'],
        ]);
        $conversation->touch();

        return response()->json([
            'reply' => $result['reply'],
            'conversation_id' => $conversation->id,
            'conversation' => $conversation->only(['id', 'title', 'updated_at']),
        ]);
    }

    /**
     * Stream an answer as server-sent events.
     *
     * Events: {"status": "..."} progress, {"token": "..."} text pieces,
     * {"error": "..."} failure, {"done": {...}} completion summary.
     */
    public function stream(Request $request, NEXPOSAssistant $assistant): mixed
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'conversation_id' => ['nullable', 'integer', 'exists:ai_conversations,id'],
        ]);

        $user = $request->user();
        $conversation = null;

        if (! empty($validated['conversation_id'])) {
            $conversation = AiConversation::query()->findOrFail((int) $validated['conversation_id']);
            $this->ensureOwner($request, $conversation);
        }

        if ($conversation === null) {
            $conversation = AiConversation::create([
                'user_id' => $user->id,
                'title' => Str::limit($validated['message'], 80),
            ]);
        }

        $conversation->messages()->create([
            'role' => 'user',
            'content' => $validated['message'],
        ]);

        $stored = $conversation->messages()
            ->orderByDesc('id')
            ->limit(11)
            ->get(['role', 'content'])
            ->reverse()
            ->values();

        $history = [];

        foreach ($stored as $message) {
            $history[] = ['role' => $message->role, 'content' => $message->content];
        }

        // Drop the just-saved user message; the assistant adds it as the prompt.
        array_pop($history);

        $conversationId = $conversation->id;
        $prompt = $validated['message'];

        return response()->stream(function () use ($assistant, $user, $prompt, $history, $conversationId): void {
            $result = $assistant->chatStream($user, $prompt, $history, function (array $event): void {
                echo 'data: '.json_encode($event, JSON_UNESCAPED_UNICODE)."\n\n";

                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
            });

            AiConversation::query()->findOrFail($conversationId)->messages()->create([
                'role' => 'assistant',
                'content' => $result['reply'],
            ]);
            AiConversation::query()->whereKey($conversationId)->update(['updated_at' => now()]);

            $conversation = AiConversation::query()->findOrFail($conversationId);

            echo 'data: '.json_encode([
                'done' => [
                    'reply' => $result['reply'],
                    'conversation_id' => $conversation->id,
                    'conversation' => $conversation->only(['id', 'title', 'updated_at']),
                ],
            ], JSON_UNESCAPED_UNICODE)."\n\n";

            if (ob_get_level() > 0) {
                ob_flush();
            }
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Generate (or fetch cached) morning briefing.
     */
    public function briefing(DailyBriefing $briefing): JsonResponse
    {
        return response()->json($briefing->generate());
    }

    /**
     * @return list<array{id: int, title: string, updated_at: string}>
     */
    private function conversationList(int $userId): array
    {
        $conversations = AiConversation::query()
            ->where('user_id', $userId)
            ->orderByDesc('updated_at')
            ->limit(30)
            ->get(['id', 'title', 'updated_at']);

        $rows = [];

        foreach ($conversations as $conversation) {
            $rows[] = [
                'id' => $conversation->id,
                'title' => $conversation->title,
                'updated_at' => $conversation->updated_at->toDateTimeString(),
            ];
        }

        return $rows;
    }

    private function ensureOwner(Request $request, AiConversation $conversation): void
    {
        abort_if($conversation->user_id !== $request->user()->id, 403);
    }
}
