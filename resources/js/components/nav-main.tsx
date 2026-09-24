import { Link } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import {
    Collapsible,
    CollapsibleContent,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { SidebarNavGroup } from '@/types';

export function NavMain({ groups }: { groups: SidebarNavGroup[] }) {
    const { currentUrl, isCurrentUrl } = useCurrentUrl();
    const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
        () => Object.fromEntries(groups.map((g) => [g.label, true])),
    );

    // isCurrentUrl dibuat baru setiap render oleh hook, jadi simpan di ref
    // agar efek di bawah tidak jalan di setiap render.
    const isCurrentUrlRef = React.useRef(isCurrentUrl);
    React.useEffect(() => {
        isCurrentUrlRef.current = isCurrentUrl;
    });

    // Buka otomatis grup halaman aktif HANYA saat URL berubah (navigasi),
    // agar tidak melawan toggle manual pengguna.
    React.useEffect(() => {
        setOpenGroups((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const group of groups) {
                const active = group.items.some(
                    (item) =>
                        item.href && isCurrentUrlRef.current(item.href),
                );
                if (active && next[group.label] === false) {
                    next[group.label] = true;
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [groups, currentUrl]);

    const toggleGroup = (label: string) =>
        setOpenGroups((prev) => ({ ...prev, [label]: prev[label] === false }));

    return (
        <>
            {groups.map((group) => {
                const open = openGroups[group.label] !== false;
                return (
                    <Collapsible
                        key={group.label}
                        open={open}
                        onOpenChange={() => toggleGroup(group.label)}
                    >
                        <SidebarGroup className="px-2 py-0">
                            <SidebarGroupLabel asChild>
                                <button
                                    type="button"
                                    aria-expanded={open}
                                    data-state={open ? 'open' : 'closed'}
                                    onClick={() => toggleGroup(group.label)}
                                    className="group/label flex w-full cursor-pointer items-center gap-1 hover:text-sidebar-foreground"
                                >
                                    <span className="flex-1 truncate text-left">
                                        {group.label}
                                    </span>
                                    <ChevronDown
                                        className={`size-4 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden ${open ? '' : '-rotate-90'}`}
                                        aria-hidden="true"
                                    />
                                    <span className="sr-only">
                                        {open
                                            ? `Sembunyikan ${group.label}`
                                            : `Tampilkan ${group.label}`}
                                    </span>
                                </button>
                            </SidebarGroupLabel>
                            <CollapsibleContent className="overflow-hidden">
                                <SidebarMenu>
                                    {group.items.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            {item.href ? (
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={isCurrentUrl(
                                                        item.href,
                                                    )}
                                                    tooltip={{
                                                        children: item.title,
                                                    }}
                                                >
                                                    <Link
                                                        href={item.href}
                                                        prefetch
                                                    >
                                                        {item.icon && (
                                                            <item.icon />
                                                        )}
                                                        <span>{item.title}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            ) : (
                                                <SidebarMenuButton
                                                    asChild
                                                    disabled
                                                    tooltip={{
                                                        children: item.title,
                                                    }}
                                                    className="aria-disabled:opacity-70"
                                                >
                                                    <span aria-disabled="true">
                                                        {item.icon && (
                                                            <item.icon />
                                                        )}
                                                        <span>{item.title}</span>
                                                        {item.comingSoon && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="ml-auto text-[10px]"
                                                            >
                                                                Segera
                                                            </Badge>
                                                        )}
                                                    </span>
                                                </SidebarMenuButton>
                                            )}
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                );
            })}
        </>
    );
}
