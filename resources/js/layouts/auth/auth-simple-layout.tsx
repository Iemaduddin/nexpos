import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Card, CardContent } from '@/components/ui/card';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6 md:p-10">
            <div className="w-full max-w-sm">
                <div className="flex flex-col gap-6">
                    <Link
                        href={home()}
                        className="flex items-center justify-center gap-2"
                        aria-label="NEXPOS"
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <AppLogoIcon className="size-5" />
                        </span>
                        <span className="text-lg font-semibold tracking-tight">
                            NEXPOS
                        </span>
                    </Link>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="mb-6 space-y-1.5 text-center">
                                <h1 className="text-xl font-semibold tracking-tight">
                                    {title}
                                </h1>
                                {description && (
                                    <p className="text-sm text-muted-foreground">
                                        {description}
                                    </p>
                                )}
                            </div>
                            {children}
                        </CardContent>
                    </Card>

                    <p className="text-center text-xs text-muted-foreground">
                        &copy; {new Date().getFullYear()} NEXPOS &middot; Point
                        of Sale & Business Intelligence
                    </p>
                </div>
            </div>
        </div>
    );
}
