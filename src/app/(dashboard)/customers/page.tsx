"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Users, ShoppingCart, DollarSign, CreditCard, Banknote, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

export default function CustomersPage() {
  const [refundId, setRefundId] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const { data: orders, isLoading } = trpc.orders.list.useQuery({ limit: 100 });

  const refund = trpc.orders.refund.useMutation({
    onSuccess: (order) => {
      toast.success(`Order ${order.orderNumber} refunded. Stock restored.`);
      utils.orders.list.invalidate();
      setRefundId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const totalRevenue = orders?.filter(o => o.status === "completed").reduce((s, o) => s + parseFloat(o.total), 0) ?? 0;
  const totalOrders = orders?.filter(o => o.status === "completed").length ?? 0;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const cashOrders = orders?.filter((o) => o.paymentMethod === "cash" && o.status === "completed").length ?? 0;
  const cardOrders = orders?.filter((o) => o.paymentMethod === "card" && o.status === "completed").length ?? 0;

  const stats = [
    { label: "Total Orders", value: String(totalOrders), icon: ShoppingCart, color: "text-brand-600", bg: "bg-brand-50" },
    { label: "Total Revenue", value: `LKR ${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
    { label: "Avg Order Value", value: `LKR ${avgOrder.toFixed(2)}`, icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Cash / Card", value: `${cashOrders} / ${cardOrders}`, icon: Banknote, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="p-6 max-w-5xl">
      {/* Refund confirm modal */}
      {refundId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h2 className="font-bold text-surface-900 mb-2">Confirm Refund</h2>
            <p className="text-sm text-surface-500 mb-5">
              This will mark the order as <strong>Refunded</strong> and restore stock for all items. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => refund.mutate({ id: refundId, restoreStock: true })}
                disabled={refund.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 font-semibold text-sm transition-colors"
              >
                {refund.isPending ? "Processing..." : "Yes, Refund"}
              </button>
              <button onClick={() => setRefundId(null)} className="flex-1 btn-secondary py-2.5">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <Users size={24} className="text-brand-600" /> Customers
        </h1>
        <p className="text-sm text-surface-400 mt-1">Order history and insights</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon size={18} className={s.color} />
            </div>
            <p className="text-xs text-surface-400 font-medium">{s.label}</p>
            <p className="text-lg font-bold text-surface-900 mt-0.5">{isLoading ? "..." : s.value}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-100">
          <h2 className="font-semibold text-surface-800">All Orders</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-surface-400 text-sm">Loading...</div>
        ) : orders?.length === 0 ? (
          <div className="p-10 text-center text-surface-300">
            <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No orders placed yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Order #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Date & Time</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Items</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Payment</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {orders?.map((order) => (
                <tr key={order.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3 font-mono font-semibold text-surface-700 text-xs">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-surface-500 text-xs">
                    {new Date(order.createdAt).toLocaleDateString()}{" "}
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-center text-surface-600">{order.items.length}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-xs text-surface-500 capitalize">
                      {order.paymentMethod === "cash" ? <Banknote size={12} /> : <CreditCard size={12} />}
                      {order.paymentMethod?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      order.status === "completed" ? "bg-green-100 text-green-700" :
                      order.status === "refunded"  ? "bg-blue-100 text-blue-700" :
                      order.status === "cancelled" ? "bg-red-100 text-red-600" :
                      "bg-amber-100 text-amber-600"
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-surface-800">
                    LKR {parseFloat(order.total).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {order.status === "completed" && (
                      <button
                        onClick={() => setRefundId(order.id)}
                        className="flex items-center gap-1 text-xs text-surface-400 hover:text-red-500 transition-colors"
                        title="Refund order"
                      >
                        <RotateCcw size={13} /> Refund
                      </button>
                    )}
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
