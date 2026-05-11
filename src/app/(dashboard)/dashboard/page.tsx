"use client";

import { trpc } from "@/lib/trpc";
import { TrendingUp, ShoppingCart, Package, DollarSign, ArrowUpRight, Clock } from "lucide-react";

export default function DashboardPage() {
  const { data: summary, isLoading } = trpc.orders.summary.useQuery();
  const { data: recentOrders } = trpc.orders.list.useQuery({ limit: 5, status: "completed" });
  const { data: products } = trpc.products.list.useQuery({ activeOnly: false });
  const { data: allActive } = trpc.products.list.useQuery({ activeOnly: true });

  const lowStockItems = allActive?.filter((p) => p.stock <= 5) ?? [];

  const stats = [
    {
      label: "Today's Revenue",
      value: isLoading ? "..." : `LKR ${parseFloat(summary?.total_revenue ?? "0").toFixed(2)}`,
      icon: DollarSign,
      color: "text-brand-600",
      bg: "bg-brand-50",
      border: "border-brand-100",
    },
    {
      label: "Orders Today",
      value: isLoading ? "..." : (summary?.total_orders ?? "0"),
      icon: ShoppingCart,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "Avg Order Value",
      value: isLoading ? "..." : `LKR ${parseFloat(summary?.avg_order_value ?? "0").toFixed(2)}`,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100",
    },
    {
      label: "Total Products",
      value: products ? String(products.length) : "...",
      icon: Package,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
  ];

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
        <p className="text-sm text-surface-400 mt-1">Today's performance overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`card p-5 border ${s.border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={20} className={s.color} />
              </div>
              <ArrowUpRight size={16} className="text-surface-300" />
            </div>
            <p className="text-xs text-surface-400 font-medium">{s.label}</p>
            <p className="text-xl font-bold text-surface-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card p-5">
          <h2 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-brand-600" /> Recent Orders
          </h2>
          {recentOrders?.length === 0 ? (
            <div className="text-center py-10 text-surface-300">
              <ShoppingCart size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No completed orders yet today</p>
            </div>
          ) : (
            <div className="space-y-0">
              {recentOrders?.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-surface-100 last:border-0">
                  <div>
                    <p className="text-sm font-mono font-semibold text-surface-700">{order.orderNumber}</p>
                    <p className="text-xs text-surface-400">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" · "}{order.items.length} item(s)
                      {" · "}<span className="capitalize">{order.paymentMethod?.replace("_", " ")}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-surface-800 text-sm">LKR {parseFloat(order.total).toFixed(2)}</p>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Paid</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-surface-800 flex items-center gap-2">
              <Package size={16} className="text-amber-500" /> Low Stock Alert
            </h2>
            <span className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-full font-medium">
              {lowStockItems.length} items
            </span>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="text-center py-10 text-surface-300">
              <Package size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">All items are well stocked!</p>
            </div>
          ) : (
            <div className="space-y-0">
              {lowStockItems.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3 border-b border-surface-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-surface-700">{p.name}</p>
                    {p.sku && <p className="text-xs text-surface-400">SKU: {p.sku}</p>}
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${p.stock === 0 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                    {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
