"use client";

import { trpc } from "@/lib/trpc";
import { DollarSign, ShoppingCart, TrendingUp } from "lucide-react";

export default function ReportsPage() {
  const { data: summary } = trpc.orders.summary.useQuery();
  const { data: recentOrders } = trpc.orders.list.useQuery({ limit: 10, status: "completed" });

  const stats = [
    {
      label: "Today's Revenue",
      value: `$${parseFloat(summary?.total_revenue ?? "0").toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Orders Today",
      value: summary?.total_orders ?? "0",
      icon: ShoppingCart,
      color: "text-brand-600",
      bg: "bg-brand-50",
    },
    {
      label: "Avg Order Value",
      value: `$${parseFloat(summary?.avg_order_value ?? "0").toFixed(2)}`,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Reports</h1>
        <p className="text-sm text-surface-400">Today's performance overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={22} className={color} />
            </div>
            <div>
              <p className="text-xs text-surface-400">{label}</p>
              <p className="text-2xl font-bold text-surface-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Completed Orders */}
      <div className="card p-5">
        <h2 className="font-semibold text-surface-800 mb-4">Recent Completed Orders</h2>
        {recentOrders?.length === 0 ? (
          <p className="text-sm text-surface-400">No completed orders yet today.</p>
        ) : (
          <div className="space-y-2">
            {recentOrders?.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
                <div>
                  <p className="text-sm font-mono font-semibold text-surface-700">{order.orderNumber}</p>
                  <p className="text-xs text-surface-400">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    {order.items.length} item(s)
                    {" · "}
                    {order.paymentMethod?.replace("_", " ")}
                  </p>
                </div>
                <p className="font-bold text-surface-800">${parseFloat(order.total).toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
