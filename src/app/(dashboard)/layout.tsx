import { DashboardShell, UserBadge } from "@/components/dashboard-shell";
import { NavLinks } from "@/components/nav-links";
import { ShoppingCart } from "lucide-react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
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
          <NavLinks />

          {/* Real user badge + sign out */}
          <UserBadge />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </DashboardShell>
  );
}
