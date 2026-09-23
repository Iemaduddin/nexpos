import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import { Bot } from 'lucide-react';
import { AppearanceToggle } from '@/components/appearance-toggle';
import AiDrawer from '@/components/ai/ai-drawer';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
}).format(new Date());

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const [aiOpen, setAiOpen] = useState(false);
    const { auth } = usePage().props;
    const canUseAi = auth.permissions.includes('ai.use');

    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4 print:hidden">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
                <div className="ml-auto flex items-center gap-1">
                    <p className="mr-2 hidden text-sm text-muted-foreground lg:block">
                        {today}
                    </p>
                    {canUseAi && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAiOpen(true)}
                            title="Buka AI Asisten"
                            aria-label="Buka AI Asisten"
                        >
                            <Bot className="size-4" />
                        </Button>
                    )}
                    <AppearanceToggle />
                </div>
            </header>
            {canUseAi && (
                <AiDrawer
                    open={aiOpen}
                    onOpenChange={setAiOpen}
                    conversations={[]}
                />
            )}
        </>
    );
}
