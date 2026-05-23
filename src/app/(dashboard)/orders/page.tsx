"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Search, ChevronDown, ChevronRight, Receipt,
  Calendar, CreditCard, CheckCircle, Clock, XCircle,
  RefreshCw, Activity, ShoppingBag, Printer, ChevronLeft, ChevronRight as ChevRight,
  TrendingUp, Package, Banknote,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  completed:  { label: "Completed",  color: "text-emerald-700", bg: "bg-emerald-100", icon: CheckCircle },
  pending:    { label: "Pending",    color: "text-amber-700",   bg: "bg-amber-100",   icon: Clock },
  cancelled:  { label: "Cancelled",  color: "text-red-700",     bg: "bg-red-100",     icon: XCircle },
  refunded:   { label: "Refunded",   color: "text-purple-700",  bg: "bg-purple-100",  icon: RefreshCw },
  processing: { label: "Processing", color: "text-blue-700",    bg: "bg-blue-100",    icon: Activity },
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash", card: "Card", credit_card: "Credit Card",
  debit_card: "Debit Card", cheque: "Cheque", stripe_terminal: "Stripe Terminal",
};

const fmt = (v: string | number) =>
  `LKR ${parseFloat(String(v)).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays  = (d: string, n: number) => {
  const dt = new Date(d); dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
};
const fmtPresetLabel = (start: string, end: string) => {
  const t = todayStr();
  const yesterday = addDays(t, -1);
  if (start === t && end === t) return "Today";
  if (start === yesterday && end === yesterday) return "Yesterday";
  return `${start} → ${end}`;
};

const PAGE_SIZE = 50;
type StatusFilter = "all" | "pending" | "processing" | "completed" | "cancelled" | "refunded";

export default function OrderHistoryPage() {
  const { t } = useLanguage();

  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [startDate, setStartDate]         = useState(todayStr());
  const [endDate, setEndDate]             = useState(todayStr());
  const [page, setPage]                   = useState(0);
  const [expandedId, setExpandedId]       = useState<string | null>(null);

  const reset = () => { setPage(0); setExpandedId(null); };

  const applyPreset = (start: string, end: string) => {
    setStartDate(start); setEndDate(end); reset();
  };

  const stepDay = (n: number) => {
    // If single-day view, step that day; otherwise shift both by n
    const newStart = addDays(startDate, n);
    const newEnd   = startDate === endDate ? newStart : addDays(endDate, n);
    setStartDate(newStart); setEndDate(newEnd); reset();
  };

  const isSingleDay = startDate === endDate;
  const isToday     = startDate === todayStr() && endDate === todayStr();

  const { data: orders, isLoading } = trpc.orders.list.useQuery({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    status: statusFilter === "all" ? undefined : statusFilter,
    paymentMethod: paymentFilter || undefined,
    search: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const completedOrders = orders?.filter(o => o.status === "completed") ?? [];
  const totalRevenue    = completedOrders.reduce((s, o) => s + parseFloat(o.total), 0);
  const totalItems      = completedOrders.reduce((s, o) => s + o.items.length, 0);
  const avgOrder        = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

  const statusTabs: { key: StatusFilter; label: string; icon: React.ElementType }[] = [
    { key: "all",        label: "All",        icon: ShoppingBag },
    { key: "completed",  label: "Completed",  icon: CheckCircle },
    { key: "pending",    label: "Pending",    icon: Clock },
    { key: "processing", label: "Processing", icon: Activity },
    { key: "refunded",   label: "Refunded",   icon: RefreshCw },
    { key: "cancelled",  label: "Cancelled",  icon: XCircle },
  ];

  // ── Date presets ──
  const now = new Date();
  const presets = [
    { label: "Today",       start: todayStr(), end: todayStr() },
    { label: "Yesterday",   start: addDays(todayStr(), -1), end: addDays(todayStr(), -1) },
    { label: "Last 7 days", start: addDays(todayStr(), -6), end: todayStr() },
    { label: "This month",  start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), end: todayStr() },
  ];

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <Receipt size={24} className="text-brand-600" /> Sales Log
        </h1>
        <p className="text-sm text-surface-400 mt-1">
          Browse all POS transactions by day or custom date range
        </p>
      </div>

      {/* ── Date Navigator ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Preset buttons */}
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => {
            const active = startDate === p.start && endDate === p.end;
            return (
              <button
                key={p.label}
                onClick={() => applyPreset(p.start, p.end)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Day navigator (single-day mode) or custom range */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => stepDay(-1)}
            className="p-1.5 rounded-lg border border-surface-200 hover:bg-surface-100 text-surface-500 transition-colors"
            title="Previous day"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded-xl px-3 py-1.5">
            <Calendar size={14} className="text-surface-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); reset(); }}
              className="bg-transparent text-sm font-semibold text-surface-800 outline-none w-32"
            />
            {!isSingleDay && (
              <>
                <span className="text-surface-400 text-xs">→</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); reset(); }}
                  className="bg-transparent text-sm font-semibold text-surface-800 outline-none w-32"
                />
              </>
            )}
            {isSingleDay && (
              <button
                onClick={() => setEndDate(addDays(startDate, 1))}
                className="text-xs text-brand-500 hover:text-brand-700 font-semibold ml-1 whitespace-nowrap"
                title="Switch to range"
              >
                + range
              </button>
            )}
          </div>

          <button
            onClick={() => stepDay(1)}
            disabled={isToday && isSingleDay}
            className="p-1.5 rounded-lg border border-surface-200 hover:bg-surface-100 text-surface-500 disabled:opacity-30 transition-colors"
            title="Next day"
          >
            <ChevRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      {!isLoading && orders && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
              <ShoppingBag size={16} className="text-brand-600" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-surface-900">{orders.length}</p>
              <p className="text-xs text-surface-400">
                {isSingleDay ? (isToday ? "Sales today" : `Sales on ${startDate}`) : "Total orders"}
              </p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Banknote size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-surface-900 leading-tight">{fmt(totalRevenue)}</p>
              <p className="text-xs text-surface-400">Completed revenue</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
              <Package size={16} className="text-sky-600" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-surface-900">{totalItems}</p>
              <p className="text-xs text-surface-400">Items sold</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <TrendingUp size={16} className="text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-surface-900 leading-tight">{completedOrders.length > 0 ? fmt(avgOrder) : "—"}</p>
              <p className="text-xs text-surface-400">Avg order value</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Status tabs ── */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl w-fit overflow-x-auto">
        {statusTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setStatusFilter(key); reset(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === key ? "bg-white shadow text-surface-900" : "text-surface-500 hover:text-surface-700"
            }`}
          >
            <Icon size={12} className={statusFilter === key ? (STATUS_META[key]?.color ?? "text-surface-600") : ""} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Filter row ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            className="input pl-8 w-48 text-sm"
            placeholder="Search order #…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); reset(); }}
          />
        </div>

        <select
          value={paymentFilter}
          onChange={(e) => { setPaymentFilter(e.target.value); reset(); }}
          className="input text-sm w-44"
        >
          <option value="">All Payment Methods</option>
          {Object.entries(PAYMENT_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {(search || paymentFilter || statusFilter !== "all") && (
          <button
            onClick={() => { setSearch(""); setPaymentFilter(""); setStatusFilter("all"); setPage(0); }}
            className="text-xs text-brand-500 hover:text-brand-700 font-semibold"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto text-xs text-surface-400 font-medium">
          {isLoading ? "Loading…" : `${orders?.length ?? 0} record${orders?.length !== 1 ? "s" : ""} shown`}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-surface-400 text-sm">{t.common.loading}</div>
        ) : !orders?.length ? (
          <div className="p-10 text-center text-surface-300">
            <ShoppingBag size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No orders found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="w-8" />
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Order #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Date & Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Items</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Payment</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Subtotal</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Tax</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Discount</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const meta = STATUS_META[order.status];
                const StatusIcon = meta?.icon ?? Activity;
                const isExpanded = expandedId === order.id;
                const totalDiscount = parseFloat(order.discountAmount ?? "0") + parseFloat(order.promoDiscount ?? "0");

                return (
                  <>
                    <tr
                      key={order.id}
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="hover:bg-surface-50 cursor-pointer border-b border-surface-100 transition-colors"
                    >
                      <td className="pl-3 py-3 text-surface-400">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-surface-800">{order.orderNumber}</td>
                      <td className="px-4 py-3 text-surface-600 whitespace-nowrap">
                        <p>{new Date(order.createdAt).toLocaleDateString("en-LK")}</p>
                        <p className="text-xs text-surface-400">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-surface-600">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-surface-600 text-xs">
                          <CreditCard size={12} className="text-surface-400" />
                          {PAYMENT_LABELS[order.paymentMethod ?? ""] ?? order.paymentMethod ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-surface-600 text-xs">{fmt(order.subtotal)}</td>
                      <td className="px-4 py-3 text-right text-surface-500 text-xs">{fmt(order.taxAmount ?? "0")}</td>
                      <td className="px-4 py-3 text-right text-xs text-red-500">
                        {totalDiscount > 0 ? `−${fmt(totalDiscount)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-surface-900">{fmt(order.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meta?.bg ?? "bg-surface-100"} ${meta?.color ?? "text-surface-600"}`}>
                          <StatusIcon size={10} /> {meta?.label ?? order.status}
                        </span>
                      </td>
                    </tr>

                    {/* ── Expanded bill detail ── */}
                    {isExpanded && (
                      <tr key={`${order.id}-exp`}>
                        <td colSpan={10} className="px-6 pb-5 pt-1 bg-surface-50/60">
                          <div className="border border-surface-200 rounded-xl overflow-hidden bg-white max-w-2xl">
                            {/* Bill header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100 bg-surface-50">
                              <div className="flex items-center gap-3">
                                <Receipt size={14} className="text-brand-500" />
                                <div>
                                  <p className="text-xs font-bold text-surface-800">{order.orderNumber}</p>
                                  <p className="text-xs text-surface-400">{new Date(order.createdAt).toLocaleString("en-LK")}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {order.promoCode && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                                    Promo: {order.promoCode}
                                  </span>
                                )}
                                {order.loyaltyPhone && (
                                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                                    Loyalty: {order.loyaltyPhone}
                                  </span>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); window.print(); }}
                                  className="flex items-center gap-1 text-xs text-surface-500 hover:text-surface-800 border border-surface-200 px-2.5 py-1 rounded-lg"
                                >
                                  <Printer size={11} /> Print
                                </button>
                              </div>
                            </div>

                            {/* Line items */}
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-surface-100 bg-surface-50/50">
                                  <th className="text-left px-4 py-2 text-surface-500 font-semibold">Product</th>
                                  <th className="text-center px-4 py-2 text-surface-500 font-semibold">Qty</th>
                                  <th className="text-right px-4 py-2 text-surface-500 font-semibold">Unit Price</th>
                                  <th className="text-right px-4 py-2 text-surface-500 font-semibold">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items.map((item) => (
                                  <tr key={item.id} className="border-b border-surface-50">
                                    <td className="px-4 py-2 font-medium text-surface-800">{item.productName}</td>
                                    <td className="px-4 py-2 text-center text-surface-600">{item.quantity}</td>
                                    <td className="px-4 py-2 text-right text-surface-600">{fmt(item.productPrice)}</td>
                                    <td className="px-4 py-2 text-right font-semibold text-surface-800">{fmt(item.subtotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            {/* Totals */}
                            <div className="px-4 py-3 border-t border-surface-100 space-y-1 bg-surface-50/40">
                              <div className="flex justify-between text-xs text-surface-500">
                                <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
                              </div>
                              {parseFloat(order.taxAmount ?? "0") > 0 && (
                                <div className="flex justify-between text-xs text-surface-500">
                                  <span>Tax</span><span>{fmt(order.taxAmount ?? "0")}</span>
                                </div>
                              )}
                              {parseFloat(order.discountAmount ?? "0") > 0 && (
                                <div className="flex justify-between text-xs text-red-500">
                                  <span>Discount</span><span>−{fmt(order.discountAmount ?? "0")}</span>
                                </div>
                              )}
                              {parseFloat(order.promoDiscount ?? "0") > 0 && (
                                <div className="flex justify-between text-xs text-green-600">
                                  <span>Promo ({order.promoCode})</span><span>−{fmt(order.promoDiscount ?? "0")}</span>
                                </div>
                              )}
                              {(order.loyaltyPointsRedeemed ?? 0) > 0 && (
                                <div className="flex justify-between text-xs text-indigo-600">
                                  <span>Loyalty pts redeemed</span><span>{order.loyaltyPointsRedeemed} pts</span>
                                </div>
                              )}
                              <div className="flex justify-between text-sm font-bold text-surface-900 pt-1.5 border-t border-surface-200 mt-1">
                                <span>Total</span><span>{fmt(order.total)}</span>
                              </div>
                              {order.paymentMethod === "cash" && order.cashReceived && (
                                <>
                                  <div className="flex justify-between text-xs text-surface-500">
                                    <span>Cash received</span><span>{fmt(order.cashReceived)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs text-surface-500">
                                    <span>Change due</span><span>{fmt(order.changeDue ?? "0")}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {orders && (orders.length === PAGE_SIZE || page > 0) && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-surface-400">
            Page {page + 1} · showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + (orders.length)}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-surface-200 disabled:opacity-40 hover:bg-surface-50 transition-colors"
            >← Previous</button>
            <button
              disabled={(orders.length) < PAGE_SIZE}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-surface-200 disabled:opacity-40 hover:bg-surface-50 transition-colors"
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
