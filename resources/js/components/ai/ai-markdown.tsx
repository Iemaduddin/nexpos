import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

function styled(tag: string, className: string) {
    return function Styled({ children }: { children?: ReactNode }) {
        const Tag = tag as 'p';

        return <Tag className={className}>{children}</Tag>;
    };
}

const components = {
    p: styled('p', 'mb-2 whitespace-pre-wrap last:mb-0'),
    strong: styled('strong', 'font-semibold'),
    em: styled('em', 'italic'),
    ul: styled('ul', 'mb-2 list-disc space-y-1 pl-5 last:mb-0'),
    ol: styled('ol', 'mb-2 list-decimal space-y-1 pl-5 last:mb-0'),
    li: styled('li', 'leading-relaxed'),
    h1: styled('h1', 'mb-2 text-base font-semibold'),
    h2: styled('h2', 'mb-2 text-base font-semibold'),
    h3: styled('h3', 'mb-1 text-sm font-semibold'),
    h4: styled('h4', 'mb-1 text-sm font-semibold'),
    code: styled(
        'code',
        'rounded bg-black/10 px-1 py-0.5 font-mono text-[13px] dark:bg-white/10',
    ),
    pre: styled('pre', 'mb-2 overflow-x-auto rounded-lg border p-2 last:mb-0'),
    blockquote: styled(
        'blockquote',
        'mb-2 border-l-2 pl-3 text-muted-foreground last:mb-0',
    ),
    table: styled('table', 'mb-2 w-full text-[13px] last:mb-0'),
    th: styled('th', 'border-b px-2 py-1 text-left font-medium'),
    td: styled('td', 'border-b px-2 py-1 align-top last:border-0'),
    a: styled('a', 'underline underline-offset-2'),
    hr: styled('hr', 'my-2 border-muted'),
};

export default function AiMarkdown({
    content,
    className,
}: {
    content: string;
    className?: string;
}) {
    return (
        <div className={cn('text-sm leading-relaxed', className)}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {content}
            </ReactMarkdown>
        </div>
    );
}
