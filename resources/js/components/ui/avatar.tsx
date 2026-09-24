import * as React from 'react';

import { cn } from '@/lib/utils';

function Avatar({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="avatar"
            className={cn(
                'relative flex size-8 shrink-0 overflow-hidden rounded-full',
                className,
            )}
            {...props}
        />
    );
}

type AvatarImageProps = React.ComponentProps<'img'> & {
    onLoadingStatusChange?: (status: 'loading' | 'loaded' | 'error') => void;
};

function AvatarImage({
    className,
    src,
    alt = '',
    onLoadingStatusChange,
    onError,
    onLoad,
    ...props
}: AvatarImageProps) {
    const [failed, setFailed] = React.useState(false);

    if (!src || failed) {
        return null;
    }

    return (
        <img
            data-slot="avatar-image"
            src={src}
            alt={alt}
            className={cn('aspect-square size-full', className)}
            onError={(e) => {
                setFailed(true);
                onLoadingStatusChange?.('error');
                onError?.(e);
            }}
            onLoad={(e) => {
                onLoadingStatusChange?.('loaded');
                onLoad?.(e);
            }}
            {...props}
        />
    );
}

function AvatarFallback({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="avatar-fallback"
            className={cn(
                'bg-muted flex size-full items-center justify-center rounded-full',
                className,
            )}
            {...props}
        />
    );
}

export { Avatar, AvatarImage, AvatarFallback };
