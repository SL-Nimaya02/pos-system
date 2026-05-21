import { DashboardShell } from "@/components/dashboard-shell";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </DashboardShell>
  );
}
