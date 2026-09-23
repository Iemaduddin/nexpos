import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function StatCard({
    title,
    value,
    sub,
    icon: Icon,
}: {
    title: string;
    value: string;
    sub?: string;
    icon: LucideIcon;
}) {
    return (
        <Card>
            <CardContent className="flex items-start justify-between gap-4 p-5">
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-2xl font-semibold tracking-tight tabular-nums">
                        {value}
                    </p>
                    {sub && (
                        <p className="text-xs text-muted-foreground">{sub}</p>
                    )}
                </div>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
                    <Icon className="size-4 text-muted-foreground" />
                </div>
            </CardContent>
        </Card>
    );
}
