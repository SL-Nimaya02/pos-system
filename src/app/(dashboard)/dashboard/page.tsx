import { LayoutDashboard, TrendingUp, ShoppingCart, Package } from "lucide-react";

export default function DashboardPage() {
  const stats = [
    { label: "Today's Revenue", value: "—", icon: TrendingUp, color: "text-brand-600", bg: "bg-brand-50" },
    { label: "Orders Today", value: "—", icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Products", value: "—", icon: Package, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <LayoutDashboard size={24} className="text-brand-600" />
          Dashboard
        </h1>
        <p className="text-sm text-surface-400 mt-1">Overview of your store performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon size={22} className={s.color} />
            </div>
            <div>
              <p className="text-xs text-surface-400 font-medium">{s.label}</p>
              <p className="text-2xl font-bold text-surface-900 mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6 text-center text-surface-400">
        <LayoutDashboard size={32} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm font-medium">Full dashboard analytics coming soon</p>
        <p className="text-xs mt-1">Connect your database to see live stats</p>
      </div>
    </div>
  );
}
