"use client";

import { signOut } from "next-auth/react";
import { useRole } from "@/contexts/role-context";
import { LogOut } from "lucide-react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function UserBadge({ collapsed = false }: { collapsed?: boolean }) {
  const { userName, userEmail, role } = useRole();
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <div className="p-3 border-t border-surface-100">
      <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-brand-700">{initials}</span>
        </div>
        {!collapsed && (
          <>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-xs font-semibold text-surface-700 truncate">{userName || "User"}</span>
              <span className="text-[10px] text-surface-400 truncate capitalize">{role}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
              className="text-surface-300 hover:text-red-500 transition-colors ml-auto"
            >
              <LogOut size={15} />
            </button>
          </>
        )}
        {collapsed && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            className="sr-only"
          />
        )}
      </div>
    </div>
  );
}
