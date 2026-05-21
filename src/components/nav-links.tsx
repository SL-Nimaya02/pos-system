"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useRole } from "@/contexts/role-context";
import { useLanguage } from "@/contexts/language-context";
import {
  LayoutDashboard, Store, Package, Box,
  FileText, BarChart3, Users, Settings, HelpCircle,
  Truck, ClipboardList, UserCog, Landmark, QrCode, Banknote,
  RotateCcw, Monitor, ClipboardCheck, CreditCard,
} from "lucide-react";

export function NavLinks({ collapsed = false }: { collapsed?: boolean }) {
  const pathname  = usePathname();
  const { isAdmin } = useRole();
  const { t } = useLanguage();

  const allNavItems = [
    // ── Daily Operations ──────────────────────────────────────────
    { href: "/dashboard",        label: t.nav.dashboard,      icon: LayoutDashboard, adminOnly: true  },
    { href: "/pos",              label: t.nav.pos,            icon: Store,           adminOnly: false },
    { href: "/cash-register",    label: t.nav.cashRegister,   icon: Banknote,        adminOnly: false },
    { href: "/orders",           label: "Orders",             icon: FileText,        adminOnly: false },
    { href: "/customers",        label: t.nav.customers,      icon: Users,           adminOnly: true  },
    { divider: true,             adminOnly: true },
    // ── Stock Management ──────────────────────────────────────────
    { href: "/products",         label: t.nav.products,       icon: Package,         adminOnly: true  },
    { href: "/inventory",        label: t.nav.inventory,      icon: Box,             adminOnly: true  },
    { href: "/barcodes",         label: t.nav.barcodes,       icon: QrCode,          adminOnly: true  },
    { href: "/grn",              label: t.nav.grn,            icon: FileText,        adminOnly: true  },
    { divider: true,             adminOnly: true },
    // ── Procurement ───────────────────────────────────────────────
    { href: "/suppliers",        label: t.nav.suppliers,      icon: Truck,           adminOnly: true  },
    { href: "/purchase-orders",  label: t.nav.purchaseOrders, icon: ClipboardList,   adminOnly: true  },
    { divider: true,             adminOnly: true },
    // ── Finance & Reports ─────────────────────────────────────────
    { href: "/reports",          label: t.nav.reports,        icon: BarChart3,       adminOnly: true  },
    { href: "/finance",          label: t.nav.finance,        icon: Landmark,        adminOnly: true  },
    { href: "/receivables",      label: "Receivables",        icon: CreditCard,      adminOnly: true  },
    { divider: true,             adminOnly: false },
    // ── Admin ─────────────────────────────────────────────────────
    { href: "/returns",          label: "Returns",            icon: RotateCcw,       adminOnly: false },
    { href: "/customer-display", label: "Customer Display",   icon: Monitor,         adminOnly: false },
    { href: "/users",            label: t.nav.users,          icon: UserCog,         adminOnly: true  },
    { href: "/audit-log",        label: "Audit Log",          icon: ClipboardCheck,  adminOnly: true  },
    { href: "/settings",         label: t.nav.settings,       icon: Settings,        adminOnly: true  },
    { href: "/help",             label: t.nav.help,           icon: HelpCircle,      adminOnly: false },
  ];

  const items = allNavItems.filter((i) => !i.adminOnly || isAdmin);

  return (
    <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
      {items.map((item, idx) => {
        if ("divider" in item && item.divider) {
          return collapsed ? null : (
            <div key={`div-${idx}`} className="my-2 border-t border-surface-100" />
          );
        }
        const navItem = item as { href: string; label: string; icon: React.ElementType; adminOnly: boolean };
        const active = pathname.startsWith(navItem.href);
        return (
          <Link
            key={navItem.href}
            href={navItem.href}
            title={collapsed ? navItem.label : undefined}
            className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all ${
              collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
            } ${
              active
                ? "bg-brand-50 text-brand-700 shadow-sm"
                : "text-surface-500 hover:bg-surface-100 hover:text-surface-800"
            }`}
          >
            <navItem.icon size={18} className={active ? "text-brand-600" : "text-surface-400"} />
            {!collapsed && <span>{navItem.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
