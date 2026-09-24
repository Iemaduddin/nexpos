import { Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    Bot,
    Boxes,
    Building2,
    FileScan,
    LayoutGrid,
    Package,
    ReceiptText,
    Ruler,
    Settings,
    ShieldCheck,
    ShoppingCart,
    Tags,
    Award,
    Truck,
    Undo2,
    Users,
    Wallet,
} from 'lucide-react';
import { index as brandsIndex } from '@/actions/App/Http/Controllers/BrandController';
import { index as sessionsIndex } from '@/actions/App/Http/Controllers/CashSessionController';
import { index as categoriesIndex } from '@/actions/App/Http/Controllers/CategoryController';
import { index as customersIndex } from '@/actions/App/Http/Controllers/CustomerController';
import { index as productsIndex } from '@/actions/App/Http/Controllers/ProductController';
import { index as purchasesIndex } from '@/actions/App/Http/Controllers/PurchaseController';
import { index as reportsIndex } from '@/actions/App/Http/Controllers/ReportController';
import {
    index as salesIndex,
    pos as posIndex,
} from '@/actions/App/Http/Controllers/SaleController';
import { index as returnsIndex } from '@/actions/App/Http/Controllers/SaleReturnController';
import { index as adjustmentsIndex } from '@/actions/App/Http/Controllers/StockAdjustmentController';
import { index as aiIndex } from '@/actions/App/Http/Controllers/AiChatController';
import { index as documentsIndex } from '@/actions/App/Http/Controllers/DocumentController';
import { index as suppliersIndex } from '@/actions/App/Http/Controllers/SupplierController';
import { index as unitsIndex } from '@/actions/App/Http/Controllers/UnitController';
import { index as usersIndex } from '@/actions/App/Http/Controllers/UserController';
import { index as rolesIndex } from '@/routes/roles';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { edit as editSettings } from '@/routes/profile';
import type { SidebarNavGroup } from '@/types';

const navGroups: SidebarNavGroup[] = [
    {
        label: 'Menu Utama',
        items: [
            {
                title: 'Dashboard',
                href: dashboard(),
                icon: LayoutGrid,
            },
        ],
    },
    {
        label: 'Penjualan',
        items: [
            {
                title: 'Kasir',
                href: posIndex(),
                icon: ShoppingCart,
                permission: 'sales.create',
            },
            {
                title: 'Riwayat Penjualan',
                href: salesIndex(),
                icon: ReceiptText,
                permission: 'sales.view',
            },
            {
                title: 'Retur & Refund',
                href: returnsIndex(),
                icon: Undo2,
                permission: 'sales.view',
            },
            {
                title: 'Sesi Kas',
                href: sessionsIndex(),
                icon: Wallet,
                permission: 'sales.view',
            },
        ],
    },
    {
        label: 'Inventaris',
        items: [
            {
                title: 'Produk',
                href: productsIndex(),
                icon: Package,
                permission: 'products.view',
            },
            {
                title: 'Kategori',
                href: categoriesIndex(),
                icon: Tags,
                permission: 'products.manage',
            },
            {
                title: 'Brand',
                href: brandsIndex(),
                icon: Award,
                permission: 'products.manage',
            },
            {
                title: 'Satuan',
                href: unitsIndex(),
                icon: Ruler,
                permission: 'products.manage',
            },
            {
                title: 'Stok & Opname',
                href: adjustmentsIndex(),
                icon: Boxes,
                permission: 'inventory.adjust',
            },
            {
                title: 'Pembelian',
                href: purchasesIndex(),
                icon: Truck,
                permission: 'inventory.purchase',
            },
            {
                title: 'Dokumen',
                href: documentsIndex(),
                icon: FileScan,
                permission: 'inventory.purchase',
            },
        ],
    },
    {
        label: 'Master Data',
        items: [
            {
                title: 'Pelanggan',
                href: customersIndex(),
                icon: Users,
                permission: 'customers.view',
            },
            {
                title: 'Supplier',
                href: suppliersIndex(),
                icon: Building2,
                permission: 'suppliers.view',
            },
        ],
    },
    {
        label: 'Pengguna',
        items: [
            {
                title: 'Pengguna',
                href: usersIndex(),
                icon: Users,
                permission: 'users.manage',
            },
            {
                title: 'Peran & Izin',
                href: rolesIndex(),
                icon: ShieldCheck,
                permission: 'users.manage',
            },
        ],
    },
    {
        label: 'Lainnya',
        items: [
            {
                title: 'Laporan',
                href: reportsIndex(),
                icon: BarChart3,
                permission: 'reports.view',
            },
            {
                title: 'AI Asisten',
                href: aiIndex(),
                icon: Bot,
                permission: 'ai.use',
            },
            {
                title: 'Pengaturan',
                href: editSettings(),
                icon: Settings,
            },
        ],
    },
];

export function AppSidebar() {
    const { auth } = usePage().props;
    const visibleGroups = navGroups
        .map((group) => ({
            ...group,
            items: group.items.filter(
                (item) =>
                    !item.permission ||
                    auth.permissions.includes(item.permission),
            ),
        }))
        .filter((group) => group.items.length > 0);

    return (
        <Sidebar collapsible="icon" variant="inset" className="print:hidden">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain groups={visibleGroups} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
