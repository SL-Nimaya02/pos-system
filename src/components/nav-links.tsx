"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useRole } from "@/contexts/role-context";
import {
  LayoutDashboard, Store, Package, Box,
  FileText, BarChart3, Users, Settings, HelpCircle,
  Truck, ClipboardList, Monitor, UserCog,
} from "lucide-react";

const allNavItems = [
  { href: "/dashboard",       label: "Dashboard",       icon: LayoutDashboard, adminOnly: true  },
  { href: "/pos",             label: "POS Screen",      icon: Store,            adminOnly: false },
  { href: "/products",        label: "Products",        icon: Package,          adminOnly: true  },
  { href: "/inventory",       label: "Inventory",       icon: Box,              adminOnly: true  },
  { href: "/grn",             label: "GRN (Stock In)",  icon: FileText,         adminOnly: true  },
  { href: "/suppliers",       label: "Suppliers",       icon: Truck,            adminOnly: true  },
  { href: "/purchase-orders", label: "Purchase Orders", icon: ClipboardList,    adminOnly: true  },
  { href: "/reports",         label: "Reports",         icon: BarChart3,        adminOnly: true  },
  { href: "/customers",       label: "Customers",       icon: Users,            adminOnly: true  },
  { href: "/kds",             label: "Kitchen Display", icon: Monitor,          adminOnly: true  },
  { href: "/users",           label: "Users",           icon: UserCog,          adminOnly: true  },
  { href: "/settings",        label: "Settings",        icon: Settings,         adminOnly: true  },
  { href: "/help",            label: "Help & Guide",    icon: HelpCircle,       adminOnly: false },
];

export function NavLinks() {
  const pathname  = usePathname();
  const { isAdmin } = useRole();

  const items = allNavItems.filter((i) => !i.adminOnly || isAdmin);

  return (
    <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              active
                ? "bg-brand-50 text-brand-700 shadow-sm"
                : "text-surface-500 hover:bg-surface-100 hover:text-surface-800"
            }`}
          >
            <item.icon size={18} className={active ? "text-brand-600" : "text-surface-400"} />
            <span className="hidden md:block">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
