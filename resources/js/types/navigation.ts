import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

export type BreadcrumbItem = {
    title: string;
    href?: NonNullable<InertiaLinkProps['href']>;
};

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
};

export type SidebarNavItem = {
    title: string;
    href?: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    comingSoon?: boolean;
    /** Permission yang dibutuhkan agar item tampil. Kosong = tampil untuk semua. */
    permission?: string;
};

export type SidebarNavGroup = {
    label: string;
    items: SidebarNavItem[];
};
