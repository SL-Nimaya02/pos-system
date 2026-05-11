"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Monitor, Clock, ChefHat, CheckCircle2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function urgencyColor(createdAt: Date): string {
  const mins = (Date.now() - createdAt.getTime()) / 60000;
  if (mins > 15) return "border-red-400 bg-red-50";
  if (mins > 8)  return "border-amber-400 bg-amber-50";
  return "border-brand-200 bg-white";
}

export default function KDSPage() {
  const [now, setNow] = useState(new Date());
  const utils = trpc.useUtils();

  // Tick every 10s to update time-ago labels and auto-refresh
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      utils.orders.list.invalidate();
    }, 10000);
    return () => clearInterval(id);
  }, [utils]);

  const { data: pendingOrders, isLoading: loadingPending } =
    trpc.orders.list.useQuery({ limit: 50, status: "pending" });
  const { data: processingOrders, isLoading: loadingProcessing } =
    trpc.orders.list.useQuery({ limit: 50, status: "processing" });

  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      utils.orders.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const allOrders = [
    ...(processingOrders ?? []).map((o) => ({ ...o, _priority: 0 })),
    ...(pendingOrders ?? []).map((o)    => ({ ...o, _priority: 1 })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const isLoading = loadingPending || loadingProcessing;

  return (
    <div className="p-6 min-h-screen bg-surface-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Monitor size={22} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Kitchen Display</h1>
            <p className="text-sm text-surface-400">
              {allOrders.length} active order{allOrders.length !== 1 ? "s" : ""} · Auto-refreshes every 10s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => utils.orders.list.invalidate()}
            className="flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-brand-600 transition-colors"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-surface-500 bg-white border border-surface-200 rounded-xl px-3 py-2">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-brand-200 border border-brand-400" /> New</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-200 border border-amber-400" /> &gt;8 min</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-200 border border-red-400" /> &gt;15 min</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-2xl animate-pulse border border-surface-100" />
          ))}
        </div>
      ) : allOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-surface-300">
          <ChefHat size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">All clear! No pending orders.</p>
          <p className="text-sm mt-1">New orders from the POS will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allOrders.map((order) => {
            const createdAt = new Date(order.createdAt);
            const isProcessing = order.status === "processing";
            return (
              <div key={order.id}
                className={`rounded-2xl border-2 shadow-sm flex flex-col overflow-hidden transition-all ${urgencyColor(createdAt)}`}
              >
                {/* Ticket header */}
                <div className={`px-4 py-3 flex items-center justify-between ${isProcessing ? "bg-amber-100" : "bg-brand-50"}`}>
                  <span className="font-mono font-bold text-sm text-surface-800">{order.orderNumber}</span>
                  <div className="flex items-center gap-1.5 text-xs text-surface-500">
                    <Clock size={12} />
                    <span key={now.toISOString()}>{timeAgo(createdAt)}</span>
                  </div>
                </div>

                {/* Status badge */}
                <div className="px-4 pt-2 pb-0">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                    isProcessing ? "bg-amber-100 text-amber-700" : "bg-brand-100 text-brand-700"
                  }`}>
                    {isProcessing ? "🔥 Preparing" : "🆕 New"}
                  </span>
                </div>

                {/* Items */}
                <div className="flex-1 px-4 py-3 space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-surface-800 leading-snug">{item.productName}</span>
                      <span className="text-sm font-bold text-brand-700 shrink-0 bg-brand-50 px-2 py-0.5 rounded-lg">×{item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="px-4 pb-4 pt-2 border-t border-surface-100 space-y-2 mt-auto">
                  {order.status === "pending" && (
                    <button
                      onClick={() => updateStatus.mutate({ id: order.id, status: "processing" })}
                      className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors active:scale-95"
                    >
                      <ChefHat size={15} /> Start Preparing
                    </button>
                  )}
                  {order.status === "processing" && (
                    <button
                      onClick={() => updateStatus.mutate({ id: order.id, status: "completed" })}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors active:scale-95"
                    >
                      <CheckCircle2 size={15} /> Mark Ready ✓
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
