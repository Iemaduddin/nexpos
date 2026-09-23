import AiChat from '@/components/ai/ai-chat';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import type { AiConversation } from '@/types';

export default function AiDrawer({
    open,
    onOpenChange,
    conversations,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    conversations: AiConversation[];
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
                <SheetHeader className="border-b px-4 py-3 text-left">
                    <SheetTitle>AI Asisten</SheetTitle>
                    <SheetDescription>
                        Tanya jawab bisnis berbasis data toko.
                    </SheetDescription>
                </SheetHeader>
                <div className="min-h-0 flex-1">
                    <AiChat
                        variant="drawer"
                        initialConversations={conversations}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
