"use client";

import { useState } from "react";
import { ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { NavLinks } from "./nav-links";
import { UserBadge } from "./dashboard-shell";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "@/contexts/language-context";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const { t } = useLanguage();

  return (
    <aside
      className={`relative z-10 flex h-full shrink-0 flex-col border-r border-surface-200 bg-white shadow-sm transition-all duration-200 ${
        collapsed ? "w-14" : "w-14 md:w-56"
      }`}
    >
      {/* Logo */}
      <div
        className={`flex items-center overflow-hidden border-b border-surface-100 ${
          collapsed ? "justify-center px-2 py-5" : "justify-center px-2 py-5 md:justify-start md:gap-2 md:px-4"
        }`}
      >
        <div className="w-8 h-8 flex items-center justify-center shrink-0">
          <ShoppingCart size={24} className="text-brand-900" />
        </div>
        {!collapsed && (
          <span className="hidden whitespace-nowrap text-lg font-bold tracking-wide text-brand-900 md:inline">
            {t.sidebar.appName}
          </span>
        )}
      </div>

      {/* Nav */}
      <NavLinks collapsed={collapsed} />

      {/* Language Switcher */}
      <div className="hidden md:block">
        <LanguageSwitcher collapsed={collapsed} />
      </div>

      {/* User badge */}
      <div className="hidden md:block">
        <UserBadge collapsed={collapsed} />
      </div>

      {/* Toggle button — floats on the right edge */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="absolute -right-3 top-[4.5rem] z-20 hidden h-6 w-6 items-center justify-center rounded-full border border-surface-200 bg-white text-surface-400 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-600 md:flex"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
