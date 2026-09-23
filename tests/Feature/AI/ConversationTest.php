<?php

use App\AI\OllamaClient;
use App\Models\AiConversation;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    Permission::create(['name' => 'ai.use']);
});

function conversationUser(): User
{
    $user = User::factory()->create();
    $user->givePermissionTo(['ai.use']);

    return $user;
}

function fakeChat(string $reply = 'Halo juga.'): void
{
    Http::fake([
        'localhost:11434/*' => Http::response([
            'message' => ['role' => 'assistant', 'content' => $reply],
        ]),
    ]);
}

test('chat creates a conversation and persists the turn', function () {
    fakeChat('Omzet Rp 60.000.');
    $this->actingAs(conversationUser());

    $response = $this->postJson(route('ai.chat'), ['message' => 'Berapa omzet?'])
        ->assertOk()
        ->assertJson(['reply' => 'Omzet Rp 60.000.']);

    $id = $response->json('conversation_id');
    expect($id)->not->toBeNull();

    $conversation = AiConversation::findOrFail($id);
    expect($conversation->title)->toBe('Berapa omzet?');
    expect($conversation->messages()->count())->toBe(2);
    expect($conversation->messages()->firstOrFail()->role)->toBe('user');
});

test('chat continues an existing conversation with db context', function () {
    fakeChat('Masih Rp 60.000.');
    $user = conversationUser();
    $this->actingAs($user);

    $first = $this->postJson(route('ai.chat'), ['message' => 'Berapa omzet?'])->json();
    $id = $first['conversation_id'];

    Http::fake([
        'localhost:11434/*' => function ($request) {
            $messages = $request->data()['messages'] ?? [];

            // System + previous user turn + new prompt.
            expect(count($messages))->toBeGreaterThanOrEqual(3);

            return Http::response([
                'message' => ['role' => 'assistant', 'content' => 'Masih Rp 60.000.'],
            ]);
        },
    ]);

    $this->postJson(route('ai.chat'), ['message' => 'Yakin?', 'conversation_id' => $id])
        ->assertOk()
        ->assertJson(['conversation_id' => $id]);

    expect(AiConversation::count())->toBe(1);
    expect(AiConversation::firstOrFail()->messages()->count())->toBe(4);
});

test('users cannot touch other users conversations', function () {
    fakeChat('Halo.');
    $this->actingAs(conversationUser());
    $id = $this->postJson(route('ai.chat'), ['message' => 'Halo'])->json('conversation_id');

    $this->actingAs(conversationUser());

    $this->postJson(route('ai.chat'), ['message' => 'Halo', 'conversation_id' => $id])
        ->assertForbidden();
    $this->getJson(route('ai.conversation', $id))->assertForbidden();
    $this->deleteJson(route('ai.conversation.destroy', $id))->assertForbidden();
});

test('list, show, and delete work for owners', function () {
    fakeChat('Halo.');
    $user = conversationUser();
    $this->actingAs($user);

    $first = $this->postJson(route('ai.chat'), ['message' => 'Satu'])->json('conversation_id');
    $second = $this->postJson(route('ai.chat'), ['message' => 'Dua'])->json('conversation_id');

    $list = $this->getJson(route('ai.conversations'))->assertOk()->json('conversations');
    expect($list)->toHaveCount(2);
    expect($list[0]['id'])->toBe($second);

    $this->getJson(route('ai.conversation', $first))
        ->assertOk()
        ->assertJsonCount(2, 'messages');

    $this->deleteJson(route('ai.conversation.destroy', $first))->assertOk();

    expect(AiConversation::count())->toBe(1);
    expect(AiConversation::find($first))->toBeNull();
});

test('ai page renders with conversations', function () {
    fakeChat('Halo.');
    $this->actingAs(conversationUser());
    $this->postJson(route('ai.chat'), ['message' => 'Halo']);

    $this->get(route('ai.index'))->assertOk();
});

test('stream endpoint emits tokens and persists the turn', function () {
    $mock = $this->mock(OllamaClient::class);
    $mock->shouldReceive('chatStream')->once()->andReturnUsing(
        function (array $messages, array $tools, callable $onToken) {
            $onToken('Halo ');
            $onToken('juga.');

            return ['content' => 'Halo juga.', 'tool_calls' => []];
        }
    );

    $this->actingAs(conversationUser());

    $response = $this->post(route('ai.stream'), ['message' => 'Halo']);
    $response->assertOk();

    $streamed = $response->streamedContent();
    expect($streamed)->toContain('"token":"Halo "');
    expect($streamed)->toContain('"done"');
    expect($streamed)->toContain('Halo juga.');

    $conversation = AiConversation::latest('id')->firstOrFail();
    expect($conversation->messages()->count())->toBe(2);
});

test('stream endpoint requires permission', function () {
    $this->actingAs(User::factory()->create());

    $this->postJson(route('ai.stream'), ['message' => 'Halo'])->assertForbidden();
});
