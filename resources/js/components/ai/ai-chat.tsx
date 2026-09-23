import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bot, MessageSquarePlus, Trash2, User } from 'lucide-react';
import {
    conversations as conversationsRoute,
    destroy as destroyRoute,
    show as showRoute,
    stream as streamRoute,
} from '@/actions/App/Http/Controllers/AiChatController';
import AiMarkdown from '@/components/ai/ai-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { csrfToken } from '@/lib/csrf';
import { cn } from '@/lib/utils';
import type { AiConversation, AiMessage } from '@/types';

const suggestions = [
    'Berapa omzet hari ini?',
    'Produk apa yang paling laku minggu ini?',
    'Stok apa saja yang menipis?',
];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': csrfToken(),
        },
    });

    if (!response.ok) {
        throw new Error(String(response.status));
    }

    return (await response.json()) as T;
}

function Messages({
    messages,
    sending,
}: {
    messages: AiMessage[];
    sending: boolean;
}) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sending]);

    if (messages.length === 0 && !sending) {
        return null;
    }

    return (
        <>
            {messages.map((message, i) => {
                // Bubble asisten kosong (placeholder stream) tidak dirender;
                // indikator titik-tiga di bawah sudah mewakilinya.
                if (
                    message.role === 'assistant' &&
                    message.content === '' &&
                    sending
                ) {
                    return null;
                }

                return (
                    <div
                        key={i}
                        className={cn(
                            'flex gap-2.5',
                            message.role === 'user' && 'flex-row-reverse',
                        )}
                    >
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
                            {message.role === 'user' ? (
                                <User className="size-4 text-muted-foreground" />
                            ) : (
                                <Bot className="size-4 text-muted-foreground" />
                            )}
                        </div>
                        <div
                            className={cn(
                                'max-w-[80%] rounded-lg border px-3 py-2',
                                message.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted/50',
                            )}
                        >
                            {message.role === 'user' ? (
                                <p className="text-sm whitespace-pre-wrap">
                                    {message.content}
                                </p>
                            ) : (
                                <AiMarkdown content={message.content} />
                            )}
                        </div>
                    </div>
                );
            })}
            {sending && (
                <div className="flex gap-2.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
                        <Bot className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-1 rounded-lg border bg-muted/50 px-3 py-2.5">
                        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
                    </div>
                </div>
            )}
            <div ref={bottomRef} />
        </>
    );
}

export default function AiChat({
    initialConversations,
    variant,
}: {
    initialConversations: AiConversation[];
    variant: 'drawer' | 'page';
}) {
    const [conversations, setConversations] =
        useState<AiConversation[]>(initialConversations);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [messages, setMessages] = useState<AiMessage[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingList, setLoadingList] = useState(false);
    const [showList, setShowList] = useState(variant === 'page');

    useEffect(() => {
        void (async () => {
            setLoadingList(true);
            await refreshList();
            setLoadingList(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function refreshList() {
        try {
            const data = await api<{ conversations: AiConversation[] }>(
                conversationsRoute.url(),
            );
            setConversations(data.conversations);
        } catch {
            // Biarkan daftar lama bila gagal dimuat.
        }
    }

    async function selectConversation(id: number) {
        setSelectedId(id);
        setShowList(false);

        try {
            const data = await api<{
                conversation: AiConversation;
                messages: AiMessage[];
            }>(showRoute(id).url);
            setMessages(data.messages);
        } catch {
            setMessages([
                {
                    role: 'assistant',
                    content: 'Percakapan tidak dapat dimuat.',
                },
            ]);
        }
    }

    function newChat() {
        setSelectedId(null);
        setMessages([]);
        setInput('');
        if (variant === 'drawer') {
            setShowList(false);
        }
    }

    async function removeConversation(id: number) {
        try {
            await api(destroyRoute(id).url, { method: 'DELETE' });
            setConversations((list) => list.filter((c) => c.id !== id));

            if (selectedId === id) {
                newChat();
            }
        } catch {
            // Abaikan; daftar akan disegarkan berikutnya.
        }
    }

    async function send(text: string) {
        const message = text.trim();

        if (!message || sending) {
            return;
        }

        const next = [...messages, { role: 'user' as const, content: message }];
        setMessages(next);
        setInput('');
        setSending(true);

        // Placeholder assistant bubble updated as tokens arrive.
        const withPlaceholder: AiMessage[] = [
            ...next,
            { role: 'assistant' as const, content: '' },
        ];
        setMessages(withPlaceholder);

        const appendToken = (token: string) => {
            setMessages((current) => {
                const updated = [...current];
                const last = updated[updated.length - 1];

                if (last && last.role === 'assistant') {
                    updated[updated.length - 1] = {
                        ...last,
                        content: last.content + token,
                    };
                }

                return updated;
            });
        };

        try {
            const response = await fetch(streamRoute.url(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'text/event-stream',
                    'X-XSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({
                    message,
                    conversation_id: selectedId,
                }),
            });

            if (!response.ok || !response.body) {
                throw new Error(String(response.status));
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let finished: {
                reply: string;
                conversation_id: number;
                conversation: AiConversation;
            } | null = null;

            for (;;) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n\n');
                buffer = parts.pop() ?? '';

                for (const part of parts) {
                    const line = part.trim();

                    if (!line.startsWith('data:')) {
                        continue;
                    }

                    const event = JSON.parse(line.slice(5).trim()) as {
                        token?: string;
                        status?: string;
                        error?: string;
                        done?: {
                            reply: string;
                            conversation_id: number;
                            conversation: AiConversation;
                        };
                    };

                    if (event.token) {
                        appendToken(event.token);
                    } else if (event.done) {
                        finished = event.done;
                    } else if (event.error) {
                        throw new Error(event.error);
                    }
                    // Status events keep the loading indicator; no UI needed.
                }
            }

            if (!finished) {
                throw new Error('Stream terputus.');
            }

            setMessages((current) => {
                const updated = [...current];
                const last = updated[updated.length - 1];

                if (last && last.role === 'assistant') {
                    updated[updated.length - 1] = {
                        ...last,
                        content: finished.reply,
                    };
                }

                return updated;
            });
            setSelectedId(finished.conversation_id);
            setLoadingList(true);
            await refreshList();
            setLoadingList(false);
        } catch {
            setMessages([
                ...next,
                {
                    role: 'assistant',
                    content:
                        'Maaf, layanan AI sedang tidak tersedia. Silakan coba lagi.',
                },
            ]);
        } finally {
            setSending(false);
        }
    }

    const list = (
        <div className="grid content-start gap-1 overflow-y-auto p-2">
            <Button
                variant="outline"
                size="sm"
                className="mb-1"
                onClick={newChat}
            >
                <MessageSquarePlus className="size-4" />
                Percakapan baru
            </Button>
            {loadingList && (
                <p className="px-2 py-1 text-xs text-muted-foreground">
                    Memuat...
                </p>
            )}
            {conversations.map((conversation) => (
                <div
                    key={conversation.id}
                    className={cn(
                        'group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm',
                        selectedId === conversation.id
                            ? 'bg-muted'
                            : 'hover:bg-muted/50',
                    )}
                >
                    <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left"
                        onClick={() => void selectConversation(conversation.id)}
                    >
                        {conversation.title}
                    </button>
                    <button
                        type="button"
                        className="hidden shrink-0 rounded p-1 text-muted-foreground group-hover:block hover:text-destructive"
                        title="Hapus percakapan"
                        aria-label={`Hapus ${conversation.title}`}
                        onClick={() => void removeConversation(conversation.id)}
                    >
                        <Trash2 className="size-3.5" />
                    </button>
                </div>
            ))}
            {conversations.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    Belum ada riwayat percakapan.
                </p>
            )}
        </div>
    );

    const chat = (
        <div className="flex min-h-0 flex-1 flex-col">
            {variant === 'drawer' && (
                <div className="flex items-center gap-1 border-b px-2 py-1.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowList(true)}
                    >
                        <ArrowLeft className="size-4" />
                        Riwayat
                    </Button>
                    <Button variant="ghost" size="sm" onClick={newChat}>
                        <MessageSquarePlus className="size-4" />
                        Baru
                    </Button>
                </div>
            )}
            <div className="grid flex-1 content-start gap-4 overflow-y-auto p-4">
                {messages.length === 0 && !sending ? (
                    <div className="mx-auto grid max-w-md gap-3 py-8 text-center">
                        <div className="mx-auto flex size-10 items-center justify-center rounded-lg border bg-muted/50">
                            <Bot className="size-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">
                            Tanya apa saja tentang bisnis Anda
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Jawaban dihitung dari data nyata toko, bukan
                            karangan.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 pt-1">
                            {suggestions.map((suggestion) => (
                                <Button
                                    key={suggestion}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void send(suggestion)}
                                >
                                    {suggestion}
                                </Button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <Messages messages={messages} sending={sending} />
                )}
            </div>
            <form
                className="flex gap-2 border-t p-3"
                onSubmit={(e) => {
                    e.preventDefault();
                    void send(input);
                }}
            >
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Tulis pertanyaan..."
                    maxLength={2000}
                    aria-label="Pesan untuk AI"
                />
                <Button
                    type="submit"
                    disabled={sending || input.trim() === ''}
                    aria-label="Kirim"
                >
                    {sending ? <Spinner /> : 'Kirim'}
                </Button>
            </form>
        </div>
    );

    if (variant === 'page') {
        return (
            <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
                <div className="overflow-hidden rounded-lg border">{list}</div>
                <div className="flex min-h-[60vh] flex-col overflow-hidden rounded-lg border">
                    {chat}
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            {showList ? (
                <div className="min-h-0 flex-1 overflow-y-auto">{list}</div>
            ) : (
                chat
            )}
        </div>
    );
}
