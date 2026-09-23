import { Link } from '@inertiajs/react';
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
            },
            {
                title: 'Riwayat Penjualan',
                href: salesIndex(),
                icon: ReceiptText,
            },
            {
                title: 'Retur & Refund',
                href: returnsIndex(),
                icon: Undo2,
            },
            {
                title: 'Sesi Kas',
                href: sessionsIndex(),
                icon: Wallet,
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
            },
            {
                title: 'Kategori',
                href: categoriesIndex(),
                icon: Tags,
            },
            {
                title: 'Brand',
                href: brandsIndex(),
                icon: Award,
            },
            {
                title: 'Satuan',
                href: unitsIndex(),
                icon: Ruler,
            },
            {
                title: 'Stok & Opname',
                href: adjustmentsIndex(),
                icon: Boxes,
            },
            {
                title: 'Pembelian',
                href: purchasesIndex(),
                icon: Truck,
            },
            {
                title: 'Dokumen',
                href: documentsIndex(),
                icon: FileScan,
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
            },
            {
                title: 'Supplier',
                href: suppliersIndex(),
                icon: Building2,
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
            },
            {
                title: 'AI Asisten',
                href: aiIndex(),
                icon: Bot,
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
                <NavMain groups={navGroups} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
