import { DashboardShell } from "@/components/dashboard-shell";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      <div className="flex h-dvh overflow-hidden">
        <Sidebar />
        {/* Main content */}
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </DashboardShell>
  );
}
