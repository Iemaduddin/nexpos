import { router } from '@inertiajs/react';
import { TriangleAlert } from 'lucide-react';
import { review } from '@/actions/App/Http/Controllers/AnomalyController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Anomaly } from '@/types';

const typeLabel: Record<string, string> = {
    revenue_drop: 'Omzet turun',
    revenue_spike: 'Omzet melonjak',
    transactions_drop: 'Transaksi turun',
    transactions_spike: 'Transaksi melonjak',
};

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
    }).format(new Date(value));
}

export default function AnomalyCard({ anomalies }: { anomalies: Anomaly[] }) {
    if (anomalies.length === 0) {
        return null;
    }

    return (
        <Card className="border-amber-200 dark:border-amber-900">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <TriangleAlert className="size-4 text-amber-600" />
                    Perlu Perhatian
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
                {anomalies.map((anomaly) => (
                    <div
                        key={anomaly.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                        <Badge
                            variant={
                                anomaly.severity === 'high'
                                    ? 'destructive'
                                    : 'secondary'
                            }
                        >
                            {anomaly.severity === 'high' ? 'Tinggi' : 'Sedang'}
                        </Badge>
                        <div className="min-w-0 flex-1">
                            <p className="font-medium">
                                {typeLabel[anomaly.type] ?? anomaly.type} ·{' '}
                                {formatDate(anomaly.date)}
                            </p>
                            {anomaly.detail?.note && (
                                <p className="truncate text-xs text-muted-foreground">
                                    {anomaly.detail.note}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                    router.patch(
                                        review(anomaly.id).url,
                                        { status: 'dismissed' },
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                Abaikan
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    router.patch(
                                        review(anomaly.id).url,
                                        { status: 'reviewed' },
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                Tandai dibaca
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
