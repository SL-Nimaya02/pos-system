"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { RotateCcw, Search, X, ChevronDown, ChevronRight, CheckSquare, Square } from "lucide-react";
import toast from "react-hot-toast";

function fmtLKR(v: string | number) {
  return `LKR ${parseFloat(String(v)).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;
}

type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productPrice: string;
  warrantyInfo: string | null;
  quantity: number;
  subtotal: string;
  createdAt: Date;
};

type OrderWithItems = {
  id: string;
  orderNumber: string;
  status: "pending" | "processing" | "completed" | "cancelled" | "refunded";
  subtotal: string;
  taxAmount: string | null;
  discountAmount: string | null;
  total: string;
  paymentMethod: "cash" | "card" | "credit_card" | "debit_card" | "cheque" | "stripe_terminal" | "account_credit" | null;
  creditAccountId: string | null;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  stripePaymentIntentId: string | null;
  cashReceived: string | null;
  changeDue: string | null;
  note: string | null;
  promoCode: string | null;
  promoDiscount: string | null;
  loyaltyPhone: string | null;
  loyaltyPointsEarned: number | null;
  loyaltyPointsRedeemed: number | null;
  sessionId: string | null;
  registerId: string | null;
  clerkUserId: string;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
};

interface RefundLineItem {
  itemId: string;
  productName: string;
  orderedQty: number;
  unitPrice: number;
  selected: boolean;
  refundQty: number;
}

export default function ReturnsPage() {
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [refundLines, setRefundLines] = useState<RefundLineItem[]>([]);
  const [restoreStock, setRestoreStock] = useState(true);

  const utils = trpc.useUtils();

  const { data: orders, isLoading } = trpc.orders.list.useQuery({
    status: "completed",
    limit: 100,
    search: search || undefined,
  });

  const partialRefund = trpc.orders.partialRefund.useMutation({
    onSuccess: (order) => {
      toast.success(`Refund processed for ${order?.orderNumber}`);
      setSelectedOrder(null);
      setRefundLines([]);
      utils.orders.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const openRefundModal = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setRefundLines(
      order.items.map((item: OrderItem) => ({
        itemId: item.id,
        productName: item.productName,
        orderedQty: item.quantity,
        unitPrice: parseFloat(item.productPrice),
        selected: true,
        refundQty: item.quantity,
      }))
    );
    setRestoreStock(true);
  };

  const toggleLine = (itemId: string) => {
    setRefundLines((lines) =>
      lines.map((l) => (l.itemId === itemId ? { ...l, selected: !l.selected } : l))
    );
  };

  const setQty = (itemId: string, qty: number) => {
    setRefundLines((lines) =>
      lines.map((l) =>
        l.itemId === itemId
          ? { ...l, refundQty: Math.max(1, Math.min(qty, l.orderedQty)) }
          : l
      )
    );
  };

  const selectedLines = refundLines.filter((l) => l.selected);
  const refundTotal = selectedLines.reduce((sum, l) => sum + l.unitPrice * l.refundQty, 0);

  const handleProcessRefund = () => {
    if (!selectedOrder) return;
    if (selectedLines.length === 0) return toast.error("Select at least one item to refund");
    partialRefund.mutate({
      orderId: selectedOrder.id,
      items: selectedLines.map((l) => ({ itemId: l.itemId, quantity: l.refundQty })),
      restoreStock,
    });
  };

  return (
    <div className="p-6">
      {/* Refund modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <div>
                <h2 className="font-bold text-surface-900">Process Refund</h2>
                <p className="text-xs text-surface-400 mt-0.5">
                  Order {selectedOrder.orderNumber} · {fmtLKR(selectedOrder.total)}
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-surface-400 hover:text-surface-600">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-1">
                Select items to refund
              </p>
              {refundLines.map((line) => (
                <div
                  key={line.itemId}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                    line.selected ? "border-brand-200 bg-brand-50" : "border-surface-100 bg-white"
                  }`}
                >
                  <button
                    onClick={() => toggleLine(line.itemId)}
                    className={line.selected ? "text-brand-600" : "text-surface-300"}
                  >
                    {line.selected ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">{line.productName}</p>
                    <p className="text-xs text-surface-400">
                      Ordered: {line.orderedQty} · {fmtLKR(line.unitPrice)} each
                    </p>
                  </div>
                  {line.selected && (
                    <div className="flex items-center gap-1 shrink-0">
                      <label className="text-xs text-surface-500 mr-1">Qty</label>
                      <input
                        type="number"
                        min={1}
                        max={line.orderedQty}
                        value={line.refundQty}
                        onChange={(e) => setQty(line.itemId, parseInt(e.target.value) || 1)}
                        className="w-16 input text-sm text-center py-1"
                      />
                    </div>
                  )}
                  <p className="text-sm font-semibold text-surface-800 shrink-0 w-24 text-right">
                    {line.selected ? fmtLKR(line.unitPrice * line.refundQty) : "—"}
                  </p>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-surface-100 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-surface-700">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-brand-600"
                  checked={restoreStock}
                  onChange={(e) => setRestoreStock(e.target.checked)}
                />
                Restore stock for refunded items
              </label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500">
                  Refund total ({selectedLines.length} item{selectedLines.length !== 1 ? "s" : ""})
                </span>
                <span className="font-bold text-surface-900">{fmtLKR(refundTotal)}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleProcessRefund}
                  disabled={partialRefund.isPending || selectedLines.length === 0}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl py-2.5 font-semibold text-sm transition-colors"
                >
                  {partialRefund.isPending ? "Processing…" : "Process Refund"}
                </button>
                <button onClick={() => setSelectedOrder(null)} className="flex-1 btn-secondary py-2.5">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <RotateCcw size={24} className="text-brand-600" />
            Returns &amp; Refunds
          </h1>
          <p className="text-sm text-surface-400 mt-1">Select a completed order to process a refund</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
        <input
          className="input pl-9 text-sm"
          placeholder="Search by order number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Orders table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-surface-400 text-sm">Loading orders…</div>
        ) : !orders?.length ? (
          <div className="p-8 text-center text-surface-400 text-sm">No completed orders found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Order #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Payment</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Items</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {orders.map((order) => (
                <ExpandableRow key={order.id} order={order} onRefund={() => openRefundModal(order)} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ExpandableRow({
  order,
  onRefund,
}: {
  order: OrderWithItems;
  onRefund: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="hover:bg-surface-50">
        <td className="px-4 py-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 font-medium text-surface-800 hover:text-brand-600 transition-colors"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {order.orderNumber}
          </button>
        </td>
        <td className="px-4 py-3 text-surface-500">
          {new Date(order.createdAt).toLocaleString("en-LK", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          })}
        </td>
        <td className="px-4 py-3 text-surface-500 capitalize">
          {(order.paymentMethod ?? "—").replace("_", " ")}
        </td>
        <td className="px-4 py-3 text-right font-semibold text-brand-600">{fmtLKR(order.total)}</td>
        <td className="px-4 py-3 text-center text-surface-500">{order.items.length}</td>
        <td className="px-4 py-3 text-right">
          <button
            onClick={onRefund}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors"
          >
            <RotateCcw size={12} /> Refund
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-4 pb-3 bg-surface-50">
            <div className="rounded-xl border border-surface-100 overflow-hidden mt-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-100">
                    <th className="text-left px-3 py-2 font-semibold text-surface-600">Product</th>
                    <th className="text-center px-3 py-2 font-semibold text-surface-600">Qty</th>
                    <th className="text-right px-3 py-2 font-semibold text-surface-600">Unit Price</th>
                    <th className="text-right px-3 py-2 font-semibold text-surface-600">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {order.items.map((item) => (
                    <tr key={item.id} className="bg-white">
                      <td className="px-3 py-2 text-surface-700">{item.productName}</td>
                      <td className="px-3 py-2 text-center text-surface-600">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-surface-600">{fmtLKR(item.productPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium text-surface-800">{fmtLKR(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
