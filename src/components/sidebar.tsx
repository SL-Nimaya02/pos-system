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
      className={`relative flex flex-col bg-white border-r border-surface-200 shrink-0 h-full z-10 shadow-sm transition-all duration-200 ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      {/* Logo */}
      <div
        className={`flex items-center border-b border-surface-100 overflow-hidden ${
          collapsed ? "justify-center px-2 py-5" : "gap-2 px-4 py-5"
        }`}
      >
        <div className="w-8 h-8 flex items-center justify-center shrink-0">
          <ShoppingCart size={24} className="text-brand-900" />
        </div>
        {!collapsed && (
          <span className="font-bold text-brand-900 text-lg tracking-wide whitespace-nowrap">
            {t.sidebar.appName}
          </span>
        )}
      </div>

      {/* Nav */}
      <NavLinks collapsed={collapsed} />

      {/* Language Switcher */}
      <LanguageSwitcher collapsed={collapsed} />

      {/* User badge */}
      <UserBadge collapsed={collapsed} />

      {/* Toggle button — floats on the right edge */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="absolute -right-3 top-[4.5rem] w-6 h-6 rounded-full bg-white border border-surface-200 shadow-sm flex items-center justify-center text-surface-400 hover:text-brand-600 hover:border-brand-300 transition-colors z-20"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
