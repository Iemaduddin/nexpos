import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { briefing } from '@/actions/App/Http/Controllers/AiChatController';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { csrfToken } from '@/lib/csrf';

export default function BriefingCard({
    initialBriefing,
}: {
    initialBriefing: string | null;
}) {
    const { auth } = usePage().props;
    const [text, setText] = useState<string | null>(initialBriefing);
    const [loading, setLoading] = useState(false);

    if (!auth.permissions.includes('ai.use')) {
        return null;
    }

    async function generate() {
        setLoading(true);

        try {
            const response = await fetch(briefing.url(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': csrfToken(),
                },
            });

            if (!response.ok) {
                throw new Error();
            }

            const data = await response.json();
            setText(typeof data.briefing === 'string' ? data.briefing : null);
        } catch {
            setText('Briefing tidak dapat dibuat saat ini. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <Sparkles className="size-4 text-muted-foreground" />
                    Briefing Pagi
                </CardTitle>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void generate()}
                    disabled={loading}
                >
                    {loading && <Spinner />}
                    {text ? 'Perbarui' : 'Buat briefing'}
                </Button>
            </CardHeader>
            <CardContent>
                {text ? (
                    <p className="text-sm whitespace-pre-wrap">{text}</p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Ringkasan otomatis kondisi bisnis kemarin: omzet, produk
                        terlaris, dan stok yang perlu perhatian.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
