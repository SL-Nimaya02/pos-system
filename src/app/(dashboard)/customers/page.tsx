"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Users, ShoppingCart, DollarSign, Banknote, CreditCard, RotateCcw,
  Star, Plus, X, Gift, Search, ChevronDown, ChevronRight, Award, TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/contexts/language-context";

type Tab = "orders" | "loyalty";

function fmtLKR(v: string | number) {
  return `LKR ${parseFloat(String(v)).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;
}

export default function CustomersPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>("orders");
  const [search, setSearch] = useState("");
  const [refundId, setRefundId] = useState<string | null>(null);

  // Loyalty UI state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showEnroll, setShowEnroll] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ name: "", phone: "", email: "" });
  const [adjustId, setAdjustId] = useState<string | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    type: "earn" as "earn" | "redeem",
    points: "",
    description: "",
  });

  const utils = trpc.useUtils();
  const { data: orders, isLoading: ordersLoading } = trpc.orders.list.useQuery({ limit: 100 });
  const { data: loyaltyMembers, isLoading: loyaltyLoading } = trpc.loyalty.list.useQuery(undefined, {
    enabled: tab === "loyalty",
  });

  // Transaction history for the expanded member
  const expandedPhone = expandedId
    ? (loyaltyMembers?.find((m) => m.id === expandedId)?.phone ?? "")
    : "";
  const { data: expandedMember } = trpc.loyalty.lookup.useQuery(
    { phone: expandedPhone },
    { enabled: !!expandedPhone },
  );

  const refund = trpc.orders.refund.useMutation({
    onSuccess: (order) => {
      toast.success(`Order ${order.orderNumber} refunded. Stock restored.`);
      utils.orders.list.invalidate();
      setRefundId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const enroll = trpc.loyalty.create.useMutation({
    onSuccess: () => {
      toast.success("Member enrolled!");
      utils.loyalty.list.invalidate();
      setShowEnroll(false);
      setEnrollForm({ name: "", phone: "", email: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const adjustPoints = trpc.loyalty.adjustPoints.useMutation({
    onSuccess: () => {
      toast.success("Points updated!");
      utils.loyalty.list.invalidate();
      setAdjustId(null);
      setAdjustForm({ type: "earn", points: "", description: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Orders stats ──────────────────────────────────────────────────────────
  const completedOrders = orders?.filter((o) => o.status === "completed") ?? [];
  const totalRevenue = completedOrders.reduce((s, o) => s + parseFloat(o.total), 0);
  const totalOrders = completedOrders.length;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const cashOrders = completedOrders.filter((o) => o.paymentMethod === "cash").length;
  const cardOrders = completedOrders.filter((o) =>
    ["card", "credit_card", "debit_card"].includes(o.paymentMethod ?? "")
  ).length;

  // ── Loyalty stats ─────────────────────────────────────────────────────────
  const totalMembers = loyaltyMembers?.length ?? 0;
  const totalPoints = loyaltyMembers?.reduce((s, m) => s + m.points, 0) ?? 0;
  const topSpender = [...(loyaltyMembers ?? [])].sort(
    (a, b) => parseFloat(b.totalSpend) - parseFloat(a.totalSpend)
  )[0];

  // ── Filtered lists ────────────────────────────────────────────────────────
  const filteredOrders = (orders ?? []).filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      (o.loyaltyPhone ?? "").includes(q)
    );
  });

  const filteredMembers = (loyaltyMembers ?? []).filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (m.name ?? "").toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      (m.email ?? "").toLowerCase().includes(q)
    );
  });

  const orderStats = [
    { label: t.dashboard.totalOrders, value: String(totalOrders), icon: ShoppingCart, color: "text-brand-600", bg: "bg-brand-50" },
    { label: t.customers.totalRevenue, value: fmtLKR(totalRevenue), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
    { label: t.customers.avgOrderValue, value: fmtLKR(avgOrder), icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
    { label: t.customers.cashCard, value: `${cashOrders} / ${cardOrders}`, icon: Banknote, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const loyaltyStats = [
    { label: "Total Members", value: String(totalMembers), icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Points Outstanding", value: totalPoints.toLocaleString(), icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Top Spender", value: topSpender?.name ?? "—", icon: Award, color: "text-purple-600", bg: "bg-purple-50" },
    {
      label: "Avg Points / Member",
      value: totalMembers > 0 ? Math.round(totalPoints / totalMembers).toLocaleString() : "0",
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ];

  return (
    <div className="p-6">
      {/* Refund confirm modal */}
      {refundId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h2 className="font-bold text-surface-900 mb-2">{t.customers.confirmRefund}</h2>
            <p className="text-sm text-surface-500 mb-5">{t.customers.refundDesc}</p>
            <div className="flex gap-3">
              <button
                onClick={() => refund.mutate({ id: refundId, restoreStock: true })}
                disabled={refund.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 font-semibold text-sm transition-colors"
              >
                {refund.isPending ? t.customers.processingRefund : t.customers.yesRefund}
              </button>
              <button onClick={() => setRefundId(null)} className="flex-1 btn-secondary py-2.5">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <Users size={24} className="text-brand-600" /> {t.customers.title}
          </h1>
          <p className="text-sm text-surface-400 mt-1">{t.customers.orderHistory}</p>
        </div>
        {tab === "loyalty" && (
          <button
            onClick={() => { setShowEnroll(true); setAdjustId(null); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Enroll Member
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl mb-6 w-fit">
        {([
          { id: "orders" as const, label: "Order History", icon: ShoppingCart },
          { id: "loyalty" as const, label: "Loyalty Program", icon: Gift },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setSearch(""); setExpandedId(null); setAdjustId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? "bg-white text-brand-700 shadow-sm"
                : "text-surface-500 hover:text-surface-700"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {(tab === "orders" ? orderStats : loyaltyStats).map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon size={18} className={s.color} />
            </div>
            <p className="text-xs text-surface-400 font-medium">{s.label}</p>
            <p className="text-lg font-bold text-surface-900 mt-0.5">
              {(tab === "orders" ? ordersLoading : loyaltyLoading) ? "…" : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── ORDERS TAB ───────────────────────────────────────────────────────── */}
      {tab === "orders" && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-3">
            <h2 className="font-semibold text-surface-800 flex-1">{t.customers.allOrders}</h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                className="input pl-9 text-sm w-52"
                placeholder="Search order # or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          {ordersLoading ? (
            <div className="p-8 text-center text-surface-400 text-sm">{t.common.loading}</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-10 text-center text-surface-300">
              <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">{search ? "No orders match your search" : t.customers.noOrdersPlaced}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.orders.orderHeader}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.orders.dateHeader}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">{t.orders.itemsHeader}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">{t.orders.paymentHeader}</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">{t.common.status}</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">{t.orders.totalHeader}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-50">
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-surface-700 text-xs">{order.orderNumber}</p>
                      {order.loyaltyPhone && (
                        <span className="text-xs text-indigo-500 flex items-center gap-1 mt-0.5">
                          <Star size={10} /> {order.loyaltyPhone}
                        </span>
                      )}
                    </td>
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
                          <RotateCcw size={13} /> {t.common.refund}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── LOYALTY TAB ──────────────────────────────────────────────────────── */}
      {tab === "loyalty" && (
        <div className="space-y-4">
          {/* Enroll form */}
          {showEnroll && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-surface-800 flex items-center gap-2">
                  <Gift size={16} className="text-brand-600" /> Enroll New Member
                </h2>
                <button onClick={() => setShowEnroll(false)} className="text-surface-400 hover:text-surface-600">
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Full Name *</label>
                  <input
                    className="input"
                    placeholder="Member name"
                    value={enrollForm.name}
                    onChange={(e) => setEnrollForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Phone * (loyalty ID)</label>
                  <input
                    className="input"
                    placeholder="07X XXXXXXX"
                    value={enrollForm.phone}
                    onChange={(e) => setEnrollForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Email (optional)</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="email@example.com"
                    value={enrollForm.email}
                    onChange={(e) => setEnrollForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() =>
                    enroll.mutate({
                      name: enrollForm.name,
                      phone: enrollForm.phone,
                      email: enrollForm.email || undefined,
                    })
                  }
                  disabled={!enrollForm.name || !enrollForm.phone || enroll.isPending}
                  className="btn-primary"
                >
                  {enroll.isPending ? "Enrolling…" : "Enroll Member"}
                </button>
                <button onClick={() => setShowEnroll(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}

          {/* Members table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-3">
              <h2 className="font-semibold text-surface-800 flex-1">Loyalty Members</h2>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  className="input pl-9 text-sm w-52"
                  placeholder="Search name or phone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {loyaltyLoading ? (
              <div className="p-8 text-center text-surface-400 text-sm">{t.common.loading}</div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-10 text-center text-surface-300">
                <Gift size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {search ? "No members match your search" : "No loyalty members yet — enroll the first one!"}
                </p>
              </div>
            ) : (
              <div>
                {filteredMembers.map((member) => (
                  <div key={member.id}>
                    {/* Member row */}
                    <div
                      className={`flex items-center px-5 py-3.5 border-b border-surface-100 transition-colors ${
                        expandedId === member.id || adjustId === member.id
                          ? "bg-indigo-50 border-indigo-100"
                          : "hover:bg-surface-50"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mr-3">
                        <span className="text-sm font-bold text-indigo-700">
                          {(member.name ?? member.phone).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {/* Name + phone */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-surface-800 text-sm">{member.name ?? "—"}</p>
                        <p className="text-xs text-surface-400">
                          {member.phone}{member.email ? ` · ${member.email}` : ""}
                        </p>
                      </div>
                      {/* Joined */}
                      <div className="text-right mr-6 shrink-0 hidden lg:block">
                        <p className="text-xs text-surface-500">{new Date(member.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-surface-400">joined</p>
                      </div>
                      {/* Total spend */}
                      <div className="text-right mr-6 shrink-0">
                        <p className="text-sm font-bold text-surface-800">{fmtLKR(member.totalSpend)}</p>
                        <p className="text-xs text-surface-400">total spend</p>
                      </div>
                      {/* Points */}
                      <div className="text-center mx-6 shrink-0 min-w-[64px]">
                        <p className="text-xl font-bold text-indigo-600">{member.points.toLocaleString()}</p>
                        <p className="text-xs text-surface-400">pts</p>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setAdjustId(adjustId === member.id ? null : member.id);
                            setAdjustForm({ type: "earn", points: "", description: "" });
                            setExpandedId(null);
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-medium transition-colors"
                        >
                          Adjust
                        </button>
                        <button
                          onClick={() => { setExpandedId(expandedId === member.id ? null : member.id); setAdjustId(null); }}
                          className="text-surface-400 hover:text-surface-700 transition-colors"
                          title="View transactions"
                        >
                          {expandedId === member.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Adjust points panel */}
                    {adjustId === member.id && (
                      <div className="px-5 py-4 bg-indigo-50 border-b border-indigo-100">
                        <p className="text-xs font-semibold text-indigo-800 mb-3 flex items-center gap-1">
                          <Star size={12} /> Adjust Points for{" "}
                          <span className="font-bold">{member.name ?? member.phone}</span>
                          <span className="ml-2 text-indigo-500 font-normal">
                            (current: {member.points.toLocaleString()} pts)
                          </span>
                        </p>
                        <div className="flex items-end gap-3 flex-wrap">
                          <div>
                            <label className="block text-xs font-medium text-surface-600 mb-1">Type</label>
                            <div className="flex gap-2">
                              {(["earn", "redeem"] as const).map((type) => (
                                <button
                                  key={type}
                                  onClick={() => setAdjustForm((f) => ({ ...f, type }))}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                    adjustForm.type === type
                                      ? type === "earn"
                                        ? "bg-green-600 text-white border-green-600"
                                        : "bg-red-600 text-white border-red-600"
                                      : "bg-white text-surface-600 border-surface-200 hover:bg-surface-50"
                                  }`}
                                >
                                  {type === "earn" ? "+ Add Points" : "− Deduct Points"}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-surface-600 mb-1">Points</label>
                            <input
                              type="number" min={1} className="input w-28 text-sm" placeholder="0"
                              value={adjustForm.points}
                              onChange={(e) => setAdjustForm((f) => ({ ...f, points: e.target.value }))}
                            />
                          </div>
                          <div className="flex-1 min-w-40">
                            <label className="block text-xs font-medium text-surface-600 mb-1">Reason</label>
                            <input
                              className="input text-sm" placeholder="e.g. Birthday bonus, correction…"
                              value={adjustForm.description}
                              onChange={(e) => setAdjustForm((f) => ({ ...f, description: e.target.value }))}
                            />
                          </div>
                          <button
                            onClick={() =>
                              adjustPoints.mutate({
                                id: member.id,
                                type: adjustForm.type,
                                points: parseInt(adjustForm.points),
                                description: adjustForm.description || undefined,
                              })
                            }
                            disabled={!adjustForm.points || parseInt(adjustForm.points) < 1 || adjustPoints.isPending}
                            className="btn-primary text-sm px-4 py-2"
                          >
                            {adjustPoints.isPending ? "Saving…" : "Save"}
                          </button>
                          <button onClick={() => setAdjustId(null)} className="btn-secondary text-sm px-3 py-2">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Transaction history panel */}
                    {expandedId === member.id && (
                      <div className="px-5 py-4 bg-surface-50 border-b border-surface-100">
                        <p className="text-xs font-semibold text-surface-600 mb-3">Transaction History (last 10)</p>
                        {!expandedMember?.transactions || expandedMember.transactions.length === 0 ? (
                          <p className="text-xs text-surface-400 text-center py-3">No transactions yet</p>
                        ) : (
                          <div className="space-y-1">
                            {expandedMember.transactions.map((tx) => (
                              <div
                                key={tx.id}
                                className="flex items-center justify-between rounded-lg px-3 py-2 bg-white border border-surface-100 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`font-semibold ${tx.type === "earn" ? "text-green-700" : "text-red-700"}`}>
                                    {tx.type === "earn" ? "+" : "−"}{tx.points} pts
                                  </span>
                                  <span className="text-surface-500">{tx.description ?? "—"}</span>
                                </div>
                                <span className="text-surface-400">
                                  {new Date(tx.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
