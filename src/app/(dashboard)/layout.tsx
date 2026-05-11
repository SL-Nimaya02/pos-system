import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import {
  ShoppingCart,
  Package,
  ClipboardList,
  BarChart3,
  Settings,
  Users,
  LayoutDashboard,
  Box,
  Store,
  FileText
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "Pos Screen", icon: Store },
  { href: "/products", label: "Products", icon: Package },
  { href: "/inventory", label: "Inventory", icon: Box },
  { href: "/grn", label: "GRN (Stock In)", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 md:w-56 flex flex-col bg-white border-r border-surface-200 shrink-0 h-full relative z-10 shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-surface-100">
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <ShoppingCart size={24} className="text-brand-900" />
          </div>
          <span className="hidden md:block font-bold text-brand-900 text-lg tracking-wide">
            Pos System
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-500 hover:text-brand-900 hover:bg-brand-50 transition-colors group"
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden md:block text-sm font-medium">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-surface-100 flex items-center gap-3">
          <UserButton afterSignOutUrl="/sign-in" />
          <span className="hidden md:block text-xs font-medium text-surface-600">User Account</span>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
