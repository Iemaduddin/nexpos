import { Head } from '@inertiajs/react';
import AiChat from '@/components/ai/ai-chat';
import { dashboard } from '@/routes';
import type { AiConversation } from '@/types';

export default function AiIndex({
    conversations,
}: {
    conversations: AiConversation[];
}) {
    return (
        <>
            <Head title="AI Asisten" />
            <AiChat variant="page" initialConversations={conversations} />
        </>
    );
}

AiIndex.layout = {
    title: 'AI Asisten',
    description: 'Tanya jawab bisnis berbasis data nyata toko Anda.',
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'AI Asisten',
        },
    ],
};
