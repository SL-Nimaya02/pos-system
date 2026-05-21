"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Banknote, LogIn, LogOut, Clock, TrendingUp,
  ArrowUpCircle, ArrowDownCircle,
  CheckCircle2, AlertTriangle, RefreshCw,
  User, Eye, LayoutDashboard, ShoppingCart, Activity,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/contexts/language-context";

function fmt(v: string | number | null | undefined) {
  return parseFloat(String(v ?? "0")).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-LK", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function fmtTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit" });
}
function sessionDuration(openedAt: Date | string) {
  const diffMs = Date.now() - new Date(openedAt).getTime();
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function CashRegisterPage() {
  const { t } = useLanguage();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<"register" | "monitor">("register");

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: active, isLoading: loadingActive } = trpc.cashRegister.getActive.useQuery();
  const { data: sessions } = trpc.cashRegister.listSessions.useQuery();

  const { data: sessionOrders } = trpc.cashRegister.sessionOrders.useQuery(
    { sessionId: active?.id ?? "" },
    { enabled: !!active?.id && activeTab === "monitor" },
  );
  const { data: todayLog } = trpc.cashRegister.todayLog.useQuery(undefined, {
    enabled: activeTab === "monitor",
  });

  // ── Open-session form ─────────────────────────────────────────────────────
  const [openForm, setOpenForm] = useState({ openingFloat: "", openedBy: "", notes: "" });

  const openSession = trpc.cashRegister.openSession.useMutation({
    onSuccess: () => {
      toast.success(t.cashRegister.sessionOpened);
      utils.cashRegister.getActive.invalidate();
      utils.cashRegister.listSessions.invalidate();
      setOpenForm({ openingFloat: "", openedBy: "", notes: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Movement form ─────────────────────────────────────────────────────────
  const [mvForm, setMvForm] = useState({ type: "in" as "in" | "out", amount: "", reason: "", performedBy: "" });

  const addMovement = trpc.cashRegister.addMovement.useMutation({
    onSuccess: () => {
      toast.success(t.cashRegister.movementAdded);
      utils.cashRegister.getActive.invalidate();
      utils.cashRegister.listSessions.invalidate();
      setMvForm({ type: "in", amount: "", reason: "", performedBy: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Close-session form ────────────────────────────────────────────────────
  const [closeForm, setCloseForm] = useState({ actualCash: "", closedBy: "", notes: "" });

  const closeSession = trpc.cashRegister.closeSession.useMutation({
    onSuccess: (res) => {
      const diff = res.variance;
      const sign = diff >= 0 ? "+" : "";
      toast.success(`${t.cashRegister.sessionClosed}  ${t.cashRegister.variance}: ${sign}${diff.toFixed(2)}`);
      utils.cashRegister.getActive.invalidate();
      utils.cashRegister.listSessions.invalidate();
      setCloseForm({ actualCash: "", closedBy: "", notes: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Derived expected balance ──────────────────────────────────────────────
  const expectedBalance = active
    ? parseFloat(active.openingFloat ?? "0") +
      parseFloat(active.cashSales ?? "0") +
      parseFloat(active.cashIn ?? "0") -
      parseFloat(active.cashOut ?? "0")
    : 0;

  // ── Activity feed: movements + orders merged newest-first ─────────────────
  const activityFeed = useMemo(() => {
    type AnyRow = { id: string; createdAt: Date | string };
    const items: Array<{ type: "movement" | "order"; time: Date; data: AnyRow }> = [];
    (active?.movements ?? []).forEach((m) =>
      items.push({ type: "movement", time: new Date(m.createdAt), data: m }),
    );
    (sessionOrders ?? []).forEach((o) =>
      items.push({ type: "order", time: new Date(o.createdAt), data: o }),
    );
    items.sort((a, b) => b.time.getTime() - a.time.getTime());
    return items;
  }, [active?.movements, sessionOrders]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loadingActive) {
    return (
      <div className="flex items-center justify-center h-64 text-surface-400">
        <RefreshCw className="animate-spin mr-2" size={20} /> {t.common.loading}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Page header + tab bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Banknote size={26} className="text-brand-600" />
          <div>
            <h1 className="text-2xl font-bold text-surface-900">{t.cashRegister.title}</h1>
            <p className="text-sm text-surface-500">{t.cashRegister.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-surface-100 rounded-xl p-1">
          {([
            { id: "register" as const, label: "Register", icon: <LayoutDashboard size={14} /> },
            { id: "monitor"  as const, label: "Monitor",  icon: <Eye size={14} /> },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-surface-500 hover:text-surface-700"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════ REGISTER TAB ════════════════════ */}
      {activeTab === "register" && (
        <>
      {/* ── NO ACTIVE SESSION ─────────────────────────────────────────────── */}
      {!active && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: open register form */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-1 text-surface-800 font-semibold text-lg">
              <LogIn size={20} className="text-brand-600" />
              {t.cashRegister.openSession}
            </div>
            <p className="text-sm text-surface-500 mb-5">{t.cashRegister.noActiveSessionDesc}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">
                  {t.cashRegister.openingFloat} (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input w-full"
                  placeholder="0.00"
                  value={openForm.openingFloat}
                  onChange={(e) => setOpenForm((f) => ({ ...f, openingFloat: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">
                  {t.cashRegister.openedBy}
                </label>
                <input
                  className="input w-full"
                  placeholder={t.cashRegister.openedByPlaceholder}
                  value={openForm.openedBy}
                  onChange={(e) => setOpenForm((f) => ({ ...f, openedBy: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">
                  {t.common.notes}
                </label>
                <input
                  className="input w-full"
                  placeholder={t.cashRegister.notesPlaceholder}
                  value={openForm.notes}
                  onChange={(e) => setOpenForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <button
                className="btn-primary w-full"
                disabled={openSession.isPending}
                onClick={() =>
                  openSession.mutate({
                    openingFloat: parseFloat(openForm.openingFloat) || 0,
                    openedBy: openForm.openedBy || undefined,
                    notes: openForm.notes || undefined,
                  })
                }
              >
                {openSession.isPending ? t.common.saving : t.cashRegister.openSession}
              </button>
            </div>
          </div>

          {/* Right: recent sessions */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-surface-700 mb-4 flex items-center gap-2">
              <Clock size={14} /> {t.cashRegister.sessionHistory}
            </h2>
            {!sessions || sessions.length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-10">{t.cashRegister.noSessions}</p>
            ) : (
              <div className="space-y-2">
                {sessions.slice(0, 6).map((s) => {
                  const expected =
                    parseFloat(s.openingFloat ?? "0") +
                    parseFloat(s.cashSales ?? "0") +
                    parseFloat(s.cashIn ?? "0") -
                    parseFloat(s.cashOut ?? "0");
                  const variance = s.actualCash != null ? parseFloat(s.actualCash) - expected : null;
                  return (
                    <div key={s.id} className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-surface-50 hover:bg-surface-100 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            s.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-surface-200 text-surface-600"
                          }`}>
                            {s.status === "open" ? t.cashRegister.sessionOpen : t.cashRegister.sessionClosed}
                          </span>
                          {s.openedBy && <span className="text-xs text-surface-500 truncate">{s.openedBy}</span>}
                        </div>
                        <p className="text-xs text-surface-400">{fmtDate(s.openedAt)}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-bold text-surface-800">LKR {fmt(s.cashSales)}</p>
                        {variance !== null && (
                          <p className={`text-xs font-semibold ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {variance >= 0 ? "+" : ""}{variance.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ACTIVE SESSION ────────────────────────────────────────────────── */}
      {active && (
        <div className="space-y-5">
          {/* Status bar */}
          <div className="card bg-emerald-50 border border-emerald-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {t.cashRegister.sessionOpen}
                </span>
                <span className="text-sm text-surface-600">
                  {t.cashRegister.openedAt}: <strong>{fmtDate(active.openedAt)}</strong>
                </span>
                {active.openedBy && (
                  <span className="text-sm text-surface-600">
                    · {t.cashRegister.openedBy}: <strong>{active.openedBy}</strong>
                  </span>
                )}
              </div>
              <span className="text-sm text-surface-500">
                {t.cashRegister.sessionId}: <code className="text-xs bg-surface-100 px-1 rounded">{active.id.slice(-8)}</code>
              </span>
            </div>
          </div>

          {/* Summary tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: t.cashRegister.openingFloat,    value: active.openingFloat,  icon: <Banknote size={16} />,         color: "text-brand-600" },
              { label: t.cashRegister.cashSales,       value: active.cashSales,     icon: <TrendingUp size={16} />,       color: "text-emerald-600" },
              { label: t.cashRegister.cardSales,       value: active.cardSales,     icon: <TrendingUp size={16} />,       color: "text-blue-600" },
              { label: t.cashRegister.cashIn,          value: active.cashIn,        icon: <ArrowUpCircle size={16} />,    color: "text-green-600" },
              { label: t.cashRegister.cashOut,         value: active.cashOut,       icon: <ArrowDownCircle size={16} />,  color: "text-red-600" },
              { label: t.cashRegister.expectedBalance, value: String(expectedBalance), icon: <Banknote size={16} />,      color: "text-purple-600" },
            ].map((tile) => (
              <div key={tile.label} className="card p-3 space-y-1">
                <div className={`flex items-center gap-1 text-xs font-medium ${tile.color}`}>
                  {tile.icon} {tile.label}
                </div>
                <p className="text-lg font-bold text-surface-900">LKR {fmt(tile.value)}</p>
              </div>
            ))}
          </div>

          {/* Main two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Left: movements log */}
            <div className="lg:col-span-2 card">
              <h2 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
                <Clock size={15} /> {t.cashRegister.movements}
              </h2>
              {active.movements.length === 0 ? (
                <p className="text-sm text-surface-400 py-6 text-center">{t.cashRegister.noMovements}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-100 text-xs text-surface-500 uppercase">
                        <th className="text-left py-2 pr-3">{t.cashRegister.movementType}</th>
                        <th className="text-right py-2 pr-3">{t.common.amount}</th>
                        <th className="text-left py-2 pr-3">{t.cashRegister.reason}</th>
                        <th className="text-left py-2">{t.cashRegister.performedBy}</th>
                        <th className="text-right py-2">{t.common.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {active.movements.map((mv) => (
                        <tr key={mv.id} className="border-b border-surface-50 hover:bg-surface-25">
                          <td className="py-2 pr-3">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              mv.type === "in"
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}>
                              {mv.type === "in" ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                              {mv.type === "in" ? t.cashRegister.cashIn : t.cashRegister.cashOut}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-right font-mono font-semibold">
                            <span className={mv.type === "in" ? "text-green-700" : "text-red-700"}>
                              {mv.type === "in" ? "+" : "−"} LKR {fmt(mv.amount)}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-surface-700">{mv.reason}</td>
                          <td className="py-2 text-surface-500 text-xs">{mv.performedBy ?? "—"}</td>
                          <td className="py-2 text-right text-xs text-surface-400">{fmtDate(mv.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right: actions */}
            <div className="space-y-4">

              {/* Add movement form */}
              <div className="card">
                <h2 className="text-sm font-semibold text-surface-700 mb-3">
                  {t.cashRegister.addMovement}
                </h2>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(["in", "out"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setMvForm((f) => ({ ...f, type }))}
                        className={`py-2 rounded-lg text-sm font-medium transition-all border ${
                          mvForm.type === type
                            ? type === "in"
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-red-600 text-white border-red-600"
                            : "bg-white text-surface-700 border-surface-200 hover:bg-surface-50"
                        }`}
                      >
                        {type === "in" ? `↑ ${t.cashRegister.cashIn}` : `↓ ${t.cashRegister.cashOut}`}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">
                      {t.common.amount} (LKR)
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="input w-full"
                      placeholder="0.00"
                      value={mvForm.amount}
                      onChange={(e) => setMvForm((f) => ({ ...f, amount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">
                      {t.cashRegister.reason} *
                    </label>
                    <input
                      className="input w-full"
                      placeholder={t.cashRegister.reasonPlaceholder}
                      value={mvForm.reason}
                      onChange={(e) => setMvForm((f) => ({ ...f, reason: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">
                      {t.cashRegister.performedBy}
                    </label>
                    <input
                      className="input w-full"
                      placeholder={t.cashRegister.openedByPlaceholder}
                      value={mvForm.performedBy}
                      onChange={(e) => setMvForm((f) => ({ ...f, performedBy: e.target.value }))}
                    />
                  </div>
                  <button
                    className="btn-primary w-full"
                    disabled={addMovement.isPending || !mvForm.amount || !mvForm.reason}
                    onClick={() =>
                      addMovement.mutate({
                        sessionId: active.id,
                        type: mvForm.type,
                        amount: parseFloat(mvForm.amount),
                        reason: mvForm.reason,
                        performedBy: mvForm.performedBy || undefined,
                      })
                    }
                  >
                    {addMovement.isPending ? t.common.saving : t.cashRegister.addMovementBtn}
                  </button>
                </div>
              </div>

              {/* Close session form */}
              <div className="card border border-amber-200 bg-amber-50">
                <h2 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <LogOut size={15} /> {t.cashRegister.closeSession}
                </h2>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 text-xs space-y-1 border border-amber-100">
                    <div className="flex justify-between text-surface-600">
                      <span>{t.cashRegister.openingFloat}</span>
                      <span className="font-mono">LKR {fmt(active.openingFloat)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>+ {t.cashRegister.cashSales}</span>
                      <span className="font-mono">LKR {fmt(active.cashSales)}</span>
                    </div>
                    <div className="flex justify-between text-green-700">
                      <span>+ {t.cashRegister.cashIn}</span>
                      <span className="font-mono">LKR {fmt(active.cashIn)}</span>
                    </div>
                    <div className="flex justify-between text-red-700">
                      <span>− {t.cashRegister.cashOut}</span>
                      <span className="font-mono">LKR {fmt(active.cashOut)}</span>
                    </div>
                    <div className="border-t border-surface-200 pt-1 flex justify-between font-semibold text-purple-700">
                      <span>{t.cashRegister.expectedBalance}</span>
                      <span className="font-mono">LKR {expectedBalance.toFixed(2)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">
                      {t.cashRegister.actualCash} (LKR) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input w-full"
                      placeholder="0.00"
                      value={closeForm.actualCash}
                      onChange={(e) => setCloseForm((f) => ({ ...f, actualCash: e.target.value }))}
                    />
                    {closeForm.actualCash && (
                      <p className={`text-xs mt-1 font-semibold flex items-center gap-1 ${
                        parseFloat(closeForm.actualCash) - expectedBalance >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}>
                        {Math.abs(parseFloat(closeForm.actualCash) - expectedBalance) < 0.01
                          ? <><CheckCircle2 size={12} /> {t.cashRegister.balanced}</>
                          : <><AlertTriangle size={12} /> {t.cashRegister.variance}: {
                            (parseFloat(closeForm.actualCash) - expectedBalance >= 0 ? "+" : "") +
                            (parseFloat(closeForm.actualCash) - expectedBalance).toFixed(2)
                          } LKR</>
                        }
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">
                      {t.cashRegister.closedBy}
                    </label>
                    <input
                      className="input w-full"
                      placeholder={t.cashRegister.openedByPlaceholder}
                      value={closeForm.closedBy}
                      onChange={(e) => setCloseForm((f) => ({ ...f, closedBy: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1">
                      {t.common.notes}
                    </label>
                    <input
                      className="input w-full"
                      placeholder={t.cashRegister.closingNotesPlaceholder}
                      value={closeForm.notes}
                      onChange={(e) => setCloseForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                  <button
                    className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    disabled={closeSession.isPending || !closeForm.actualCash}
                    onClick={() =>
                      closeSession.mutate({
                        sessionId: active.id,
                        actualCash: parseFloat(closeForm.actualCash),
                        closedBy: closeForm.closedBy || undefined,
                        notes: closeForm.notes || undefined,
                      })
                    }
                  >
                    {closeSession.isPending ? t.common.processing : t.cashRegister.closeSessionBtn}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SESSION HISTORY (shown when a session is active) ─────────────── */}
      {active && (
      <div className="card">
        <h2 className="text-sm font-semibold text-surface-700 mb-4">{t.cashRegister.sessionHistory}</h2>
        {!sessions || sessions.length === 0 ? (
          <p className="text-sm text-surface-400 text-center py-8">{t.cashRegister.noSessions}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 text-xs text-surface-500 uppercase tracking-wide">
                  <th className="text-left py-2 pr-4">{t.common.status}</th>
                  <th className="text-left py-2 pr-4">{t.cashRegister.openedAt}</th>
                  <th className="text-left py-2 pr-4">{t.cashRegister.closedAt}</th>
                  <th className="text-right py-2 pr-4">{t.cashRegister.openingFloat}</th>
                  <th className="text-right py-2 pr-4">{t.cashRegister.cashSales}</th>
                  <th className="text-right py-2 pr-4">{t.cashRegister.cardSales}</th>
                  <th className="text-right py-2 pr-4">{t.cashRegister.expectedBalance}</th>
                  <th className="text-right py-2 pr-4">{t.cashRegister.actualCash}</th>
                  <th className="text-right py-2">{t.cashRegister.variance}</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const expected =
                    parseFloat(s.openingFloat ?? "0") +
                    parseFloat(s.cashSales ?? "0") +
                    parseFloat(s.cashIn ?? "0") -
                    parseFloat(s.cashOut ?? "0");
                  const variance = s.actualCash != null
                    ? parseFloat(s.actualCash) - expected
                    : null;
                  return (
                    <tr key={s.id} className="border-b border-surface-50 hover:bg-surface-25">
                      <td className="py-2.5 pr-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          s.status === "open"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-surface-100 text-surface-600"
                        }`}>
                          {s.status === "open" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                          {s.status === "open" ? t.cashRegister.sessionOpen : t.cashRegister.sessionClosed}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-surface-600 text-xs">{fmtDate(s.openedAt)}</td>
                      <td className="py-2.5 pr-4 text-surface-600 text-xs">{fmtDate(s.closedAt)}</td>
                      <td className="py-2.5 pr-4 text-right font-mono">{fmt(s.openingFloat)}</td>
                      <td className="py-2.5 pr-4 text-right font-mono text-emerald-700">{fmt(s.cashSales)}</td>
                      <td className="py-2.5 pr-4 text-right font-mono text-blue-700">{fmt(s.cardSales)}</td>
                      <td className="py-2.5 pr-4 text-right font-mono text-purple-700">{expected.toFixed(2)}</td>
                      <td className="py-2.5 pr-4 text-right font-mono">{s.actualCash ? fmt(s.actualCash) : "—"}</td>
                      <td className="py-2.5 text-right font-mono font-semibold">
                        {variance === null ? "—" : (
                          <span className={variance >= 0 ? "text-green-600" : "text-red-600"}>
                            {variance >= 0 ? "+" : ""}{variance.toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )} {/* end active && session history */}
        </>
      )}

      {/* ════════════════════ MONITOR TAB ════════════════════ */}
      {activeTab === "monitor" && (
        <div className="space-y-5">

          {/* ── WHO IS AT THE TILL ────────────────────────────────────────── */}
          {active ? (
            <div className="card bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
              <div className="flex flex-wrap items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <User size={26} className="text-emerald-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xl font-bold text-surface-900">
                      {active.openedBy ?? "Unknown Operator"}
                    </p>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE
                    </span>
                  </div>
                  <p className="text-sm text-surface-500 mt-0.5">
                    Session started {fmtDate(active.openedAt)} · Running for{" "}
                    <strong className="text-surface-700">{sessionDuration(active.openedAt)}</strong>
                  </p>
                  <p className="text-xs text-surface-400 mt-0.5">
                    Session ID:{" "}
                    <code className="bg-white border border-surface-200 px-1.5 py-0.5 rounded text-surface-600">
                      {active.id.slice(-8)}
                    </code>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {[
                  { label: "Cash Sales", value: fmt(active.cashSales), color: "text-emerald-700", isCount: false },
                  { label: "Card Sales", value: fmt(active.cardSales), color: "text-blue-700",    isCount: false },
                  { label: "Movements",  value: String(active.movements.length), color: "text-amber-700", isCount: true },
                  { label: "Orders",     value: sessionOrders ? String(sessionOrders.length) : "…", color: "text-brand-700", isCount: true },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl px-3 py-2.5 border border-emerald-100 text-center">
                    <p className={`text-xs font-medium ${s.color} mb-0.5`}>{s.label}</p>
                    <p className="text-base font-bold text-surface-900">
                      {s.isCount ? s.value : `LKR ${s.value}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card text-center py-12">
              <User size={40} className="text-surface-200 mx-auto mb-3" />
              <p className="font-semibold text-surface-600 text-lg">No one is at the till right now</p>
              <p className="text-sm text-surface-400 mt-1">Open a register session to start tracking activity</p>
            </div>
          )}

          {/* ── TWO-COLUMN: Today's sessions + Activity feed ──────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Today's Sessions */}
            <div className="card">
              <h2 className="text-sm font-semibold text-surface-700 mb-4 flex items-center gap-2">
                <Clock size={14} /> Today&apos;s Sessions
              </h2>
              {!todayLog || todayLog.length === 0 ? (
                <p className="text-sm text-surface-400 text-center py-10">No sessions opened today</p>
              ) : (
                <div className="space-y-3">
                  {todayLog.map((s) => {
                    const exp =
                      parseFloat(s.openingFloat ?? "0") +
                      parseFloat(s.cashSales ?? "0") +
                      parseFloat(s.cashIn ?? "0") -
                      parseFloat(s.cashOut ?? "0");
                    return (
                      <div
                        key={s.id}
                        className={`rounded-xl p-3 border text-sm space-y-2 ${
                          s.status === "open"
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-surface-50 border-surface-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            s.status === "open" ? "bg-emerald-100" : "bg-surface-200"
                          }`}>
                            <User size={14} className={s.status === "open" ? "text-emerald-700" : "text-surface-500"} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-surface-900 truncate">{s.openedBy ?? "Unknown"}</p>
                            <p className="text-xs text-surface-400">
                              {fmtTime(s.openedAt)}
                              {s.closedAt ? ` → ${fmtTime(s.closedAt)}` : " → now"}
                            </p>
                          </div>
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                            s.status === "open"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-surface-200 text-surface-600"
                          }`}>
                            {s.status === "open" ? "Open" : "Closed"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          <div className="flex justify-between bg-white rounded px-2 py-1 border border-surface-100">
                            <span className="text-surface-500">Cash</span>
                            <span className="font-mono text-emerald-700">{fmt(s.cashSales)}</span>
                          </div>
                          <div className="flex justify-between bg-white rounded px-2 py-1 border border-surface-100">
                            <span className="text-surface-500">Card</span>
                            <span className="font-mono text-blue-700">{fmt(s.cardSales)}</span>
                          </div>
                          <div className="flex justify-between bg-white rounded px-2 py-1 border border-surface-100 col-span-2">
                            <span className="text-surface-500">Expected balance</span>
                            <span className="font-mono font-semibold text-purple-700">LKR {exp.toFixed(2)}</span>
                          </div>
                        </div>
                        {s.movements.length > 0 && (
                          <p className="text-xs text-surface-400">
                            {s.movements.length} movement{s.movements.length !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Activity Feed */}
            <div className="lg:col-span-2 card">
              <h2 className="text-sm font-semibold text-surface-700 mb-4 flex items-center gap-2">
                <Activity size={14} /> Activity Feed
                {active && activityFeed.length > 0 && (
                  <span className="ml-auto text-xs text-surface-400 font-normal">
                    {activityFeed.length} event{activityFeed.length !== 1 ? "s" : ""} this session
                  </span>
                )}
              </h2>
              {!active ? (
                <p className="text-sm text-surface-400 text-center py-10">
                  No active session — activity will appear here once a session is opened
                </p>
              ) : activityFeed.length === 0 ? (
                <p className="text-sm text-surface-400 text-center py-10">
                  No activity recorded yet for this session
                </p>
              ) : (
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {activityFeed.map((item) => {
                    if (item.type === "movement") {
                      const mv = item.data as typeof active.movements[0];
                      return (
                        <div
                          key={`mv-${mv.id}`}
                          className="flex items-start gap-3 p-3 rounded-lg bg-surface-50 border border-surface-100"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            mv.type === "in" ? "bg-green-100" : "bg-red-100"
                          }`}>
                            {mv.type === "in"
                              ? <ArrowUpCircle size={14} className="text-green-700" />
                              : <ArrowDownCircle size={14} className="text-red-700" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-sm font-semibold ${mv.type === "in" ? "text-green-700" : "text-red-700"}`}>
                                {mv.type === "in" ? "Cash In" : "Cash Out"} · LKR {fmt(mv.amount)}
                              </span>
                              <span className="text-xs text-surface-400 flex-shrink-0">{fmtTime(mv.createdAt)}</span>
                            </div>
                            <p className="text-xs text-surface-600 mt-0.5">{mv.reason}</p>
                            {mv.performedBy && (
                              <p className="text-xs text-surface-400 mt-0.5">by {mv.performedBy}</p>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const ord = item.data as any;
                      return (
                        <div
                          key={`ord-${ord.id}`}
                          className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <ShoppingCart size={14} className="text-blue-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-surface-900">
                                Sale · LKR {fmt(ord.total)}
                              </span>
                              <span className="text-xs text-surface-400 flex-shrink-0">{fmtTime(ord.createdAt)}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-xs text-surface-500">
                                #{ord.orderNumber ?? ord.id?.slice(-6)}
                              </span>
                              {ord.paymentMethod && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium capitalize">
                                  {String(ord.paymentMethod).replace(/_/g, " ")}
                                </span>
                              )}
                              {ord.items && (
                                <span className="text-xs text-surface-400">
                                  {ord.items.length} item{ord.items.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
