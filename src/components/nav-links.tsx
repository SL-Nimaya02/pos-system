"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRole } from "@/contexts/role-context";
import { useLanguage } from "@/contexts/language-context";
import { ChevronDown } from "lucide-react";
import {
  LayoutDashboard, Store, Package, Box,
  FileText, BarChart3, Users, Settings, HelpCircle,
  Truck, ClipboardList, UserCog, Landmark, QrCode, Banknote,
  RotateCcw, ClipboardCheck, CreditCard,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  adminOnly: boolean;
};

type NavGroup = {
  key: string;
  groupLabel: string;
  groupIcon: React.ElementType;
  adminOnly: boolean;
  items: NavItem[];
};

export function NavLinks({ collapsed = false }: { collapsed?: boolean }) {
  const pathname  = usePathname();
  const { isAdmin } = useRole();
  const { t } = useLanguage();

  const groups: NavGroup[] = [
    {
      key: "operations",
      groupLabel: t.sidebar.operations,
      groupIcon: Store,
      adminOnly: false,
      items: [
        { href: "/dashboard",     label: t.nav.dashboard,    icon: LayoutDashboard, adminOnly: true  },
        { href: "/pos",           label: t.nav.pos,          icon: Store,           adminOnly: false },
        { href: "/cash-register", label: t.nav.cashRegister, icon: Banknote,        adminOnly: false },
        { href: "/orders",        label: t.nav.orders,       icon: FileText,        adminOnly: false },
        { href: "/customers",     label: t.nav.customerManagement, icon: Users,      adminOnly: true  },
        { href: "/returns",       label: t.nav.returns,      icon: RotateCcw,       adminOnly: false },
      ],
    },
    {
      key: "inventory",
      groupLabel: t.sidebar.inventory,
      groupIcon: Package,
      adminOnly: true,
      items: [
        { href: "/products",   label: t.nav.products,  icon: Package,        adminOnly: true },
        { href: "/inventory",  label: t.nav.inventory, icon: Box,            adminOnly: true },
        { href: "/barcodes",   label: t.nav.barcodes,  icon: QrCode,         adminOnly: true },
        { href: "/grn",        label: t.nav.grn,       icon: ClipboardCheck, adminOnly: true },
      ],
    },
    {
      key: "procurement",
      groupLabel: t.sidebar.procurement,
      groupIcon: Truck,
      adminOnly: true,
      items: [
        { href: "/suppliers",       label: t.nav.suppliers,      icon: Truck,         adminOnly: true },
        { href: "/purchase-orders", label: t.nav.purchaseOrders, icon: ClipboardList, adminOnly: true },
      ],
    },
    {
      key: "finance",
      groupLabel: t.sidebar.finance,
      groupIcon: BarChart3,
      adminOnly: true,
      items: [
        { href: "/reports",     label: t.nav.reports, icon: BarChart3,  adminOnly: true },
        { href: "/finance",     label: t.nav.finance, icon: Landmark,   adminOnly: true },
        { href: "/receivables", label: t.nav.receivables, icon: CreditCard, adminOnly: true },
      ],
    },
    {
      key: "management",
      groupLabel: t.sidebar.management,
      groupIcon: Settings,
      adminOnly: false,
      items: [
        { href: "/users",            label: t.nav.users,        icon: UserCog,        adminOnly: true  },
        { href: "/audit-log",        label: t.nav.auditLog,     icon: ClipboardCheck, adminOnly: true  },
        { href: "/settings",         label: t.nav.settings,     icon: Settings,       adminOnly: true  },
        { href: "/help",             label: t.nav.help,         icon: HelpCircle,     adminOnly: false },
      ],
    },
  ];

  // Filter groups and items by role
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((group) => group.items.length > 0 && (!group.adminOnly || isAdmin));

  // Determine which group is active based on current pathname
  const activeGroupKey = visibleGroups.find((g) =>
    g.items.some((item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)))
  )?.key ?? visibleGroups[0]?.key;

  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set([activeGroupKey]));

  // When route changes, ensure the active group is open
  useEffect(() => {
    if (activeGroupKey) {
      setOpenGroups((prev) => new Set([...prev, activeGroupKey]));
    }
  }, [activeGroupKey]);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // When collapsed: show group icon for closed groups, item icons for open groups
  if (collapsed) {
    return (
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleGroups.map((group, gi) => {
          const isOpen = openGroups.has(group.key);
          const isGroupActive = group.items.some(
            (item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          );
          return (
            <div key={group.key}>
              {gi > 0 && <div className="my-1.5 border-t border-surface-100 mx-1" />}
              {isOpen ? (
                // Open group: show toggle button first, then all item icons
                <>
                  <button
                    onClick={() => toggleGroup(group.key)}
                    title={`Collapse ${group.groupLabel}`}
                    className={`w-full flex items-center justify-center rounded-xl py-2 mb-0.5 transition-all ${
                      isGroupActive
                        ? "bg-brand-100 text-brand-700"
                        : "bg-surface-100 text-surface-500 hover:bg-surface-200"
                    }`}
                  >
                    <group.groupIcon size={16} />
                  </button>
                  {group.items.map((item) => {
                    const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        className={`flex items-center justify-center rounded-xl py-2.5 transition-all ${
                          active
                            ? "bg-brand-50 text-brand-700 shadow-sm"
                            : "text-surface-500 hover:bg-surface-100 hover:text-surface-800"
                        }`}
                      >
                        <item.icon size={18} className={active ? "text-brand-600" : "text-surface-400"} />
                      </Link>
                    );
                  })}
                </>

              ) : (
                // Closed group: show just the group icon as a toggle button
                <button
                  onClick={() => toggleGroup(group.key)}
                  title={group.groupLabel}
                  className={`w-full flex items-center justify-center rounded-xl py-2.5 transition-all ${
                    isGroupActive
                      ? "bg-brand-50 text-brand-600"
                      : "text-surface-400 hover:bg-surface-100 hover:text-surface-700"
                  }`}
                >
                  <group.groupIcon size={18} />
                </button>
              )}
            </div>
          );
        })}
      </nav>
    );
  }

  // Expanded mode: accordion groups
  return (
    <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
      {visibleGroups.map((group) => {
        const isOpen = openGroups.has(group.key);
        const isGroupActive = group.items.some(
          (item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
        );

        return (
          <div key={group.key}>
            {/* Group Header (toggle button) */}
            <button
              onClick={() => toggleGroup(group.key)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                isGroupActive
                  ? "text-brand-700 bg-brand-50"
                  : "text-surface-400 hover:text-surface-700 hover:bg-surface-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <group.groupIcon size={14} className={isGroupActive ? "text-brand-600" : "text-surface-400"} />
                <span>{group.groupLabel}</span>
              </div>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
              />
            </button>

            {/* Group Items */}
            {isOpen && (
              <div className="ml-2 pl-2 border-l-2 border-surface-100 mt-0.5 mb-1 space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-surface-500 hover:bg-surface-100 hover:text-surface-800"
                      }`}
                    >
                      <item.icon size={15} className={active ? "text-brand-600" : "text-surface-400"} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
