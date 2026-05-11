"use client";

import { trpc } from "@/lib/trpc";

const statusColors: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-purple-100 text-purple-700",
  processing: "bg-blue-100 text-blue-700",
};

export default function OrdersPage() {
  const { data: orders, isLoading } = trpc.orders.list.useQuery({ limit: 50 });

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Orders</h1>
        <p className="text-sm text-surface-400">Recent transaction history</p>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-surface-400 text-sm">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Items</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Payment</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {orders?.map((order) => (
                <tr key={order.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-surface-700">
                    {order.orderNumber}
                  </td>
                  <td className="px-4 py-3 text-surface-500">
                    {new Date(order.createdAt).toLocaleDateString()}{" "}
                    <span className="text-xs">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-surface-600">{order.items.length} item(s)</td>
                  <td className="px-4 py-3 capitalize text-surface-600">
                    {order.paymentMethod?.replace("_", " ") ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-surface-800">
                    ${parseFloat(order.total).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] ?? ""}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
