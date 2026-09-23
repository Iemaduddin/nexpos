import { AppContent } from '@/components/app-content';
import { AppFooter } from '@/components/app-footer';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import PageHeader from '@/components/page-header';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
    title,
    description,
    actions,
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="min-w-0 overflow-x-clip">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-6">
                    {title && (
                        <PageHeader
                            title={title}
                            description={description}
                            actions={actions}
                        />
                    )}
                    {children}
                </div>
                <AppFooter />
            </AppContent>
        </AppShell>
    );
}
