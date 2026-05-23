"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  DollarSign, ShoppingCart, Package, TrendingUp, TrendingDown,
  Users, Truck, ClipboardList, AlertTriangle, Clock,
  CreditCard, Zap, Star, Activity, ArrowUpRight, ArrowDownRight,
  CheckCircle, XCircle, RefreshCw, CalendarDays, Calendar,
  Banknote, Wallet, Settings2, Filter, ChevronDown,
} from "lucide-react";
import {
  fmt, KpiCard, Section, Empty, RevenueAreaChart, CashFlowChart,
  HorizBarChart, DonutChart, HourlyRadar, VertBarChart,
  PIE_COLORS,
} from "@/components/dashboard-widgets";
import { useLanguage } from "@/contexts/language-context";

// ─── helpers ─────────────────────────────────────────────────────────────────
const shortDay = (iso: string) => {
  // monthly labels come pre-formatted (e.g. "Jan 2026")
  if (/^[A-Za-z]{3} \d{4}$/.test(iso)) return iso;
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

const paymentLabel: Record<string, string> = {
  cash: "Cash", card: "Card", credit_card: "Credit Card", debit_card: "Debit Card", cheque: "Cheque", stripe_terminal: "Stripe",
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  completed:  { label: "Completed",  color: "text-emerald-700", bg: "bg-emerald-100", icon: CheckCircle },
  pending:    { label: "Pending",    color: "text-amber-700",   bg: "bg-amber-100",   icon: Clock },
  cancelled:  { label: "Cancelled",  color: "text-red-700",     bg: "bg-red-100",     icon: XCircle },
  refunded:   { label: "Refunded",   color: "text-purple-700",  bg: "bg-purple-100",  icon: RefreshCw },
  processing: { label: "Processing", color: "text-blue-700",    bg: "bg-blue-100",    icon: Activity },
};

// ─── page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t, language } = useLanguage();
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");

  // P&L State
  const [pnlPeriod, setPnlPeriod] = useState<"daily" | "3days" | "1week" | "1month" | "custom">("daily");
  const [customDays, setCustomDays] = useState(7);
  const [isPnlDropdownOpen, setIsPnlDropdownOpen] = useState(false);

  // Stock Filter State
  const [stockFilter, setStockFilter] = useState<"out" | "low" | "adequate" | "high">("low");

  // Local lastUpdated removed to use actual POS activity from backend.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const utils = trpc.useUtils();

  // ── Refresh handler ──
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      utils.orders.summary.invalidate(),
      utils.orders.list.invalidate(),
      utils.orders.weeklyRevenue.invalidate(),
      utils.orders.topProducts.invalidate(),
      utils.orders.paymentBreakdown.invalidate(),
      utils.orders.hourlyOrders.invalidate(),
      utils.orders.categoryRevenue.invalidate(),
      utils.orders.orderStatusBreakdown.invalidate(),
      utils.orders.pnl.invalidate(),
      utils.finance.cashFlow.invalidate(),
      utils.suppliers.pendingCheques.invalidate(),
    ]);
    setIsRefreshing(false);
  }, [utils]);

  // ── Existing queries ──
  const { data: summary, isLoading } = trpc.orders.summary.useQuery();
  const { data: recentOrders }       = trpc.orders.list.useQuery({ limit: 6, status: "completed" });
  const { data: allProducts }        = trpc.products.list.useQuery({ activeOnly: false });
  const { data: activeProducts }     = trpc.products.list.useQuery({ activeOnly: true });
  const { data: categories }         = trpc.categories.list.useQuery();
  const { data: suppliers }          = trpc.suppliers.list.useQuery();
  const { data: purchaseOrders }     = trpc.purchaseOrders.list.useQuery();
  const { data: users }              = trpc.users.list.useQuery();

  // ── Analytics queries (period-aware) ──
  const { data: weeklyRaw }     = trpc.orders.weeklyRevenue.useQuery({ period });
  const { data: topProductsRaw }= trpc.orders.topProducts.useQuery({ period });
  const { data: paymentRaw }    = trpc.orders.paymentBreakdown.useQuery({ period });
  const { data: hourlyRaw }     = trpc.orders.hourlyOrders.useQuery({ period });
  const { data: categoryRevRaw }= trpc.orders.categoryRevenue.useQuery({ period });
  const { data: statusRaw }     = trpc.orders.orderStatusBreakdown.useQuery({ period });
  const { data: cashFlow }      = trpc.finance.cashFlow.useQuery({});
  const { data: pendingCheques } = trpc.suppliers.pendingCheques.useQuery();

  // ── P&L Query ──
  const pnlStart = new Date();
  pnlStart.setHours(0, 0, 0, 0);
  if (pnlPeriod === "daily") {
    // start is today
  } else if (pnlPeriod === "3days") {
    pnlStart.setDate(pnlStart.getDate() - 2);
  } else if (pnlPeriod === "1week") {
    pnlStart.setDate(pnlStart.getDate() - 6);
  } else if (pnlPeriod === "1month") {
    pnlStart.setMonth(pnlStart.getMonth() - 1);
  } else if (pnlPeriod === "custom") {
    pnlStart.setDate(pnlStart.getDate() - Math.max(0, customDays - 1));
  }
  const { data: pnlData, isLoading: isPnlLoading } = trpc.orders.pnl.useQuery({
    startDate: pnlStart.toISOString(),
  });

  // ── Derived values ──
  const outOfStock  = activeProducts?.filter(p => p.stock === 0).length ?? 0;
  const activeSup   = suppliers?.filter(s => s.isActive).length ?? 0;
  
  const filteredStock = (activeProducts || []).filter(p => {
    if (stockFilter === "out") return p.stock === 0;
    if (stockFilter === "low") return p.stock > 0 && p.stock <= 5;
    if (stockFilter === "adequate") return p.stock > 5 && p.stock <= 20;
    if (stockFilter === "high") return p.stock > 20;
    return false;
  }).sort((a, b) => a.stock - b.stock);
  const pendingPOs  = purchaseOrders?.filter(p => p.status === "ordered").length ?? 0;
  const draftPOs    = purchaseOrders?.filter(p => p.status === "draft").length ?? 0;
  const totalPOSpend= purchaseOrders?.reduce((s, p) => s + parseFloat(p.totalAmount), 0) ?? 0;

  // ── Chart data transformations ──
  const weeklyData = (weeklyRaw ?? []).map(r => ({
    day: shortDay(r.day), revenue: parseFloat(r.revenue), orders: parseInt(r.orders),
  }));

  const cfTotals   = cashFlow?.totals;
  const cfDailyRaw = cashFlow?.daily ?? [];
  // Show last 30 days but label every other point to avoid crowding
  const cfData = cfDailyRaw.map(d => ({
    date: d.date,
    totalIn:  d.totalIn,
    totalOut: -d.totalOut, // Negative for downward rendering
    net:      d.net,
  }));

  const topData = (topProductsRaw ?? []).map(r => ({
    name: r.name.length > 16 ? r.name.slice(0, 16) + "…" : r.name,
    revenue: parseFloat(r.revenue),
    units: parseInt(r.units_sold),
  }));

  const pieData = (paymentRaw ?? []).map(r => ({
    name: paymentLabel[r.payment_method] ?? r.payment_method,
    value: parseFloat(r.revenue),
    sub: `${r.count} orders`,
  }));

  // Build full 24-h hourly array (fill gaps with 0)
  const hourlyMap = Object.fromEntries((hourlyRaw ?? []).map(r => [r.hour, parseInt(r.orders)]));
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, "0")}:00`,
    orders: hourlyMap[i] ?? 0,
  })).filter((_, i) => i % 2 === 0); // every 2 h to keep radar readable

  const catData = (categoryRevRaw ?? []).map(r => ({
    name: r.category.length > 14 ? r.category.slice(0, 14) + "…" : r.category,
    revenue: parseFloat(r.revenue),
    units: parseInt(r.units),
    color: r.color,
  }));

  const statusData = (statusRaw ?? []).map(r => ({
    label: STATUS_META[r.status]?.label ?? r.status,
    count: parseInt(r.count),
    color: STATUS_META[r.status]?.color ?? "text-surface-600",
    bg: STATUS_META[r.status]?.bg ?? "bg-surface-100",
    icon: STATUS_META[r.status]?.icon ?? Activity,
  }));

  // ── Derived P&L calculations ──
  const grossProfit = pnlData ? parseFloat(pnlData.net_sales) - parseFloat(pnlData.cogs) : 0;
  const netProfit = pnlData ? grossProfit - parseFloat(pnlData.total_expenses) + parseFloat(pnlData.total_other_income) : 0;
  const isProfit = netProfit >= 0;
  const pnlColor = isProfit ? "text-emerald-700" : "text-rose-700";
  const pnlBg = isProfit ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200";
  const PnlIcon = isProfit ? TrendingUp : TrendingDown;

  // ── Pending cheques urgency ──
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const chequeUrgency = (pendingCheques ?? []).map(c => {
    if (!c.chequeDate) return "upcoming" as const;
    const d = new Date(c.chequeDate); d.setHours(0, 0, 0, 0);
    const diff = Math.floor((d.getTime() - today.getTime()) / 86_400_000);
    if (diff < 0)  return "overdue"  as const;
    if (diff <= 3) return "dueSoon"  as const;
    return "upcoming" as const;
  });
  const overdueCount  = chequeUrgency.filter(u => u === "overdue").length;
  const dueSoonCount  = chequeUrgency.filter(u => u === "dueSoon").length;
  const chequesTotal  = (pendingCheques ?? []).reduce((s, c) => s + parseFloat(c.amount ?? "0"), 0);
  const hasUrgent     = overdueCount > 0;
  const hasDueSoon    = dueSoonCount > 0;

  // ── KPI cards ──
  const stats = [
    { label: t.dashboard.todayRevenue,   value: isLoading ? "—" : fmt(summary?.total_revenue ?? "0"),    sub: t.dashboard.completedSales,      icon: DollarSign,    gradient: "from-indigo-500 to-purple-600",  glow: "shadow-indigo-200"  },
    { label: t.dashboard.netSales,       value: isLoading ? "—" : fmt(summary?.net_sales ?? "0"),         sub: t.dashboard.netSalesSub,         icon: ArrowUpRight,  gradient: "from-teal-500 to-emerald-500",   glow: "shadow-teal-200"    },
    { label: t.dashboard.ordersToday,    value: isLoading ? "—" : String(summary?.total_orders ?? "0"),  sub: t.dashboard.completedOrders,     icon: ShoppingCart,  gradient: "from-sky-500 to-cyan-400",       glow: "shadow-sky-200"     },
    { label: t.dashboard.avgOrderValue,  value: isLoading ? "—" : fmt(summary?.avg_order_value ?? "0"),  sub: t.dashboard.perCompletedOrder,   icon: TrendingUp,    gradient: "from-emerald-500 to-teal-400",   glow: "shadow-emerald-200" },
    { label: t.dashboard.totalProducts,  value: allProducts ? String(allProducts.length) : "—",           sub: `${outOfStock} ${t.dashboard.outOfStock}`, icon: Package, gradient: "from-orange-500 to-amber-400",  glow: "shadow-orange-200"  },
    { label: t.dashboard.activeSuppliers, value: String(activeSup),  sub: `${suppliers?.length ?? 0} ${t.dashboard.totalLabel}`,  icon: Truck,          gradient: "from-pink-500 to-rose-400",      glow: "shadow-pink-200"    },
    { label: t.dashboard.staffMembers,   value: String(users?.length ?? "—"), sub: t.users.userManagement, icon: Users,             gradient: "from-violet-500 to-purple-400",  glow: "shadow-violet-200"  },
    { label: t.nav.purchaseOrders,      value: String(purchaseOrders?.length ?? "—"), sub: `${pendingPOs} ${t.dashboard.awaiting}`,   icon: ClipboardList, gradient: "from-cyan-500 to-blue-400",      glow: "shadow-cyan-200"    },
    { label: t.dashboard.categories,     value: String(categories?.length ?? "—"), sub: t.products.tabs.categories,  icon: Star,            gradient: "from-amber-500 to-yellow-400",   glow: "shadow-amber-200"   },
    { label: t.dashboard.pendingPayments, value: isLoading ? "—" : fmt(summary?.pending_payments ?? "0"),  sub: `${summary?.pending_orders ?? "0"} ${t.dashboard.unpaidOrdersToday}`,  icon: Clock,       gradient: "from-fuchsia-500 to-pink-500",   glow: "shadow-fuchsia-200" },
  ];

  return (
    <div className="p-6 space-y-8">

      {/* ── P&L Indicator Banner ── */}
      <div className={`rounded-2xl border p-4 shadow-sm transition-all duration-300 ${pnlBg}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isProfit ? "bg-emerald-100" : "bg-rose-100"}`}>
              <PnlIcon size={20} className={pnlColor} />
            </div>
            <div>
              <h3 className={`text-lg font-extrabold tracking-tight ${pnlColor}`}>
                {isPnlLoading ? t.dashboard.calculating : `${fmt(Math.abs(netProfit))} ${isProfit ? t.dashboard.profit : t.dashboard.loss}`}
              </h3>
              <p className={`text-xs font-medium opacity-80 ${pnlColor}`}>
                {t.dashboard.grossProfit}: {isPnlLoading ? "—" : fmt(grossProfit)} · {t.dashboard.cogs}: {isPnlLoading ? "—" : fmt(pnlData?.cogs ?? 0)} · {t.dashboard.expenses}: {isPnlLoading ? "—" : fmt(pnlData?.total_expenses ?? 0)}
              </p>
            </div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setIsPnlDropdownOpen(!isPnlDropdownOpen)}
              className="flex items-center gap-2 bg-white/80 hover:bg-white text-surface-800 px-4 py-2 rounded-xl border border-white shadow-sm transition-all outline-none"
            >
              <Settings2 size={16} className="text-surface-500" />
              <span className="text-sm font-bold">
                {pnlPeriod === "daily" ? t.dashboard.todayEod : pnlPeriod === "3days" ? t.dashboard.last3Days : pnlPeriod === "1week" ? t.dashboard.last1Week : pnlPeriod === "1month" ? t.dashboard.last1Month : t.dashboard.custom}
              </span>
              <ChevronDown size={16} className={`text-surface-400 transition-transform ${isPnlDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isPnlDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsPnlDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-surface-100 rounded-2xl shadow-xl overflow-hidden z-20 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  {(["daily", "3days", "1week", "1month", "custom"] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => {
                        setPnlPeriod(p);
                        if (p !== "custom") setIsPnlDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${
                        pnlPeriod === p ? "bg-emerald-50 text-emerald-700" : "text-surface-700 hover:bg-surface-50"
                      }`}
                    >
                      {p === "daily" ? t.dashboard.todayEod : p === "3days" ? t.dashboard.last3Days : p === "1week" ? t.dashboard.last1Week : p === "1month" ? t.dashboard.last1Month : t.dashboard.customEllipsis}
                    </button>
                  ))}
                  
                  {pnlPeriod === "custom" && (
                    <div className="px-4 py-3 bg-surface-50 border-t border-surface-100 mt-2">
                      <label className="text-xs font-semibold text-surface-500 mb-1.5 block">{t.dashboard.numberOfDays}</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="1" 
                          max="365"
                          value={customDays} 
                          onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                          className="w-20 bg-white text-sm font-bold rounded-lg px-2 py-1.5 border border-surface-200 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" 
                        />
                        <button 
                          onClick={() => setIsPnlDropdownOpen(false)}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg transition-colors shadow-sm"
                        >
                          {t.pos.apply}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-surface-900 tracking-tight">{t.dashboard.title}</h1>
          <p className="text-sm text-surface-400 mt-1">
            {new Date().toLocaleDateString(language === "si" ? "si-LK" : language === "ta" ? "ta-LK" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period toggle */}
          <div className="flex items-center gap-1 bg-surface-100 p-1 rounded-xl">
            <button
              onClick={() => setPeriod("daily")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === "daily" ? "bg-white shadow text-surface-900" : "text-surface-500 hover:text-surface-700"
              }`}
            >
              <CalendarDays size={13} /> {t.common.daily}
            </button>
            <button
              onClick={() => setPeriod("monthly")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === "monthly" ? "bg-white shadow text-surface-900" : "text-surface-500 hover:text-surface-700"
              }`}
            >
              <Calendar size={13} /> {t.common.monthly}
            </button>
          </div>
          {summary?.last_activity && (
            <div className="flex items-center gap-2 text-xs text-surface-400">
              <Clock size={13} />
              <span>{t.common.updated} {new Date(summary.last_activity).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold bg-surface-100 hover:bg-surface-200 text-surface-600 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} /> {t.common.refresh}
          </button>
          <span className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {t.dashboard.live}
          </span>
        </div>
      </div>

      {/* ── 8 KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(s => <KpiCard key={s.label} {...s} />)}
      </div>

      {/* ── Pending Cheques Reminder Banner ── */}
      {pendingCheques && pendingCheques.length > 0 && (
        <div className={`rounded-2xl border p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          hasUrgent  ? "bg-red-50 border-red-200"   :
          hasDueSoon ? "bg-orange-50 border-orange-200" :
                       "bg-amber-50 border-amber-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${hasUrgent ? "bg-red-100" : hasDueSoon ? "bg-orange-100" : "bg-amber-100"}`}>
              <CreditCard size={20} className={hasUrgent ? "text-red-600" : hasDueSoon ? "text-orange-600" : "text-amber-600"} />
            </div>
            <div>
              <h3 className={`text-base font-extrabold tracking-tight flex items-center gap-2 ${hasUrgent ? "text-red-700" : hasDueSoon ? "text-orange-700" : "text-amber-700"}`}>
                {hasUrgent && <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">⚠ {overdueCount} Overdue</span>}
                {!hasUrgent && hasDueSoon && <span className="inline-flex items-center gap-1 text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">{dueSoonCount} Due Soon</span>}
                {pendingCheques.length} Pending {pendingCheques.length === 1 ? "Cheque" : "Cheques"} · {fmt(chequesTotal)}
              </h3>
              <p className={`text-xs font-medium opacity-80 mt-0.5 ${hasUrgent ? "text-red-700" : hasDueSoon ? "text-orange-700" : "text-amber-700"}`}>
                {overdueCount > 0 && `${overdueCount} overdue · `}
                {dueSoonCount > 0 && `${dueSoonCount} due within 3 days · `}
                {pendingCheques.length - overdueCount - dueSoonCount > 0 && `${pendingCheques.length - overdueCount - dueSoonCount} upcoming · `}
                Total outstanding: {fmt(chequesTotal)}
              </p>
            </div>
          </div>
          <a
            href="#pending-cheques"
            className={`shrink-0 text-xs font-bold px-4 py-2 rounded-xl transition-colors ${
              hasUrgent  ? "bg-red-100 hover:bg-red-200 text-red-700"     :
              hasDueSoon ? "bg-orange-100 hover:bg-orange-200 text-orange-700" :
                           "bg-amber-100 hover:bg-amber-200 text-amber-700"
            }`}
          >
            View Cheques ↓
          </a>
        </div>
      )}

      {/* ── Inventory Status ── */}
      <Section title={t.dashboard.inventoryStatus} sub={t.dashboard.inventoryStatusSub} icon={Package} iconColor="text-emerald-500">
        <div className="flex items-center flex-wrap gap-2 mb-4">
          <Filter size={14} className="text-surface-400 mr-1" />
          <button 
            onClick={() => setStockFilter("out")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${stockFilter === "out" ? "bg-red-100 text-red-700 ring-1 ring-red-300 shadow-sm" : "bg-surface-100 text-surface-500 hover:bg-surface-200 hover:text-surface-700"}`}
          >
            {t.inventory.outOfStock}
          </button>
          <button 
            onClick={() => setStockFilter("low")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${stockFilter === "low" ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300 shadow-sm" : "bg-surface-100 text-surface-500 hover:bg-surface-200 hover:text-surface-700"}`}
          >
            {t.dashboard.lowStockRange}
          </button>
          <button 
            onClick={() => setStockFilter("adequate")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${stockFilter === "adequate" ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300 shadow-sm" : "bg-surface-100 text-surface-500 hover:bg-surface-200 hover:text-surface-700"}`}
          >
            {t.dashboard.adequateRange}
          </button>
          <button 
            onClick={() => setStockFilter("high")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${stockFilter === "high" ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 shadow-sm" : "bg-surface-100 text-surface-500 hover:bg-surface-200 hover:text-surface-700"}`}
          >
            {t.dashboard.highStockRange}
          </button>
        </div>

        {filteredStock.length === 0
          ? <Empty icon={Package} label={t.dashboard.noProductsCategory} />
          : (
            <div className="flex overflow-x-auto gap-4 pb-2 snap-x">
              {filteredStock.map(p => {
                const pct = stockFilter === "high" || stockFilter === "adequate" ? 100 : Math.min(100, Math.round((p.stock / 5) * 100));
                const bar = p.stock === 0 ? "bg-red-500" : p.stock <= 5 ? "bg-amber-400" : p.stock <= 20 ? "bg-blue-400" : "bg-emerald-400";
                const badge = p.stock === 0 ? "bg-red-100 text-red-600" : p.stock <= 5 ? "bg-amber-100 text-amber-700" : p.stock <= 20 ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700";
                return (
                  <div key={p.id} className="min-w-[280px] sm:min-w-[300px] shrink-0 border border-surface-100 rounded-xl p-3 snap-start bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-semibold text-surface-700 leading-tight">{p.name}</p>
                        {p.sku && <p className="text-xs text-surface-400">SKU: {p.sku}</p>}
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg shrink-0 ml-2 ${badge}`}>
                        {p.stock === 0 ? t.dashboard.out : `${p.stock} ${t.dashboard.left}`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </Section>

      {/* ── Revenue trend (full width) ── */}
      <Section title={t.dashboard.revenueTrend} sub={period === "daily" ? "Last 7 days" : "Last 12 months"} icon={Zap} iconColor="text-indigo-500">
        <RevenueAreaChart data={weeklyData} />
      </Section>

      {/* ── Cash Flow (full width) ── */}
      <Section title={t.dashboard.cashFlow} sub={t.dashboard.cashFlowSub} icon={Wallet} iconColor="text-emerald-500">
        {/* Summary tiles */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight size={15} className="text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">{t.dashboard.totalInflow}</span>
            </div>
            <p className="text-xl font-extrabold text-emerald-700">
              {cfTotals ? fmt(cfTotals.totalIn) : "—"}
            </p>
            {cfTotals && (
              <p className="text-xs text-emerald-500 mt-0.5">
                {t.dashboard.sales} {fmt(cfTotals.salesCash + cfTotals.salesCard + cfTotals.salesOther)} · {t.dashboard.other} {fmt(cfTotals.income + cfTotals.cashIn)}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-red-50 border border-red-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownRight size={15} className="text-red-600" />
              <span className="text-xs font-semibold text-red-700">{t.dashboard.totalOutflow}</span>
            </div>
            <p className="text-xl font-extrabold text-red-700">
              {cfTotals ? fmt(cfTotals.totalOut) : "—"}
            </p>
            {cfTotals && (
              <p className="text-xs text-red-400 mt-0.5">
                {t.dashboard.expenses} {fmt(cfTotals.expenses)} · {t.dashboard.activeSuppliers} {fmt(cfTotals.supplierPayments)}
              </p>
            )}
          </div>
          <div className={`rounded-xl border p-4 ${
            !cfTotals ? "bg-surface-50 border-surface-100" :
            cfTotals.net >= 0 ? "bg-indigo-50 border-indigo-100" : "bg-orange-50 border-orange-100"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Banknote size={15} className={!cfTotals ? "text-surface-500" : cfTotals.net >= 0 ? "text-indigo-600" : "text-orange-600"} />
              <span className={`text-xs font-semibold ${!cfTotals ? "text-surface-600" : cfTotals.net >= 0 ? "text-indigo-700" : "text-orange-700"}`}>{t.dashboard.netCash}</span>
            </div>
            <p className={`text-xl font-extrabold ${!cfTotals ? "text-surface-700" : cfTotals.net >= 0 ? "text-indigo-700" : "text-orange-700"}`}>
              {cfTotals ? fmt(cfTotals.net) : "—"}
            </p>
            {cfTotals && (
              <p className={`text-xs mt-0.5 ${cfTotals.net >= 0 ? "text-indigo-400" : "text-orange-400"}`}>
                {cfTotals.net >= 0 ? t.dashboard.positiveCash : t.dashboard.negativeCash}
              </p>
            )}
          </div>
        </div>
        {/* Chart */}
        <CashFlowChart data={cfData} />
        {/* Legend */}
        <div className="flex items-center gap-5 mt-3 justify-center">
          <span className="flex items-center gap-1.5 text-xs text-surface-500">
            <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> {t.dashboard.inflow}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-surface-500">
            <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> {t.dashboard.outflow}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-surface-500">
            <span className="w-3 h-1 bg-indigo-500 inline-block rounded" /> {t.dashboard.net}
          </span>
        </div>
      </Section>

      {/* ── Row: Top Products + Payment Mix ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Section title={t.dashboard.topProducts} sub={period === "daily" ? "Last 7 days" : "Last 12 months"} icon={Star} iconColor="text-amber-500">
            <HorizBarChart data={topData} dataKey="revenue" labelKey="name" />
          </Section>
        </div>
        <div className="lg:col-span-2">
          <Section title={t.dashboard.paymentMix} sub={period === "daily" ? "Last 7 days" : "Last 12 months"} icon={CreditCard} iconColor="text-emerald-500">
            <DonutChart data={pieData} />
          </Section>
        </div>
      </div>

      {/* ── Row: Category Revenue + Order Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Section title={t.dashboard.salesByCategory} sub={period === "daily" ? "Last 7 days" : "Last 12 months"} icon={Package} iconColor="text-purple-500">
            <HorizBarChart data={catData} dataKey="revenue" labelKey="name" color1="#8b5cf6" color2="#c4b5fd" />
          </Section>
        </div>
        <div className="lg:col-span-2">
          <Section title={t.dashboard.orderStatus} sub={period === "daily" ? "Last 7 days" : "Last 12 months"} icon={Activity} iconColor="text-sky-500">
            {statusData.length === 0
              ? <Empty icon={Activity} label="No order data" />
              : (
                <div className="space-y-3 mt-1">
                  {statusData.map(s => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                            <Icon size={15} className={s.color} />
                          </div>
                          <span className="text-sm font-medium text-surface-700">{s.label}</span>
                        </div>
                        <span className={`text-sm font-bold ${s.color}`}>{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </Section>
        </div>
      </div>

      {/* ── Row: Hourly Radar + Supplier Snapshot ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title={t.dashboard.peakHours} sub={period === "daily" ? "Last 7 days" : "Last 30 days"} icon={Clock} iconColor="text-teal-500">
          <HourlyRadar data={hourlyData} />
        </Section>

        <Section title={t.dashboard.activeSuppliers} sub={t.dashboard.supplierDirectory} icon={Truck} iconColor="text-pink-500">
          {!suppliers || suppliers.length === 0
            ? <Empty icon={Truck} label={t.dashboard.noSuppliersAdded} />
            : (
              <div className="space-y-0">
                {suppliers.slice(0, 6).map(s => (
                  <div key={s.id} className="flex items-center justify-between py-3 border-b border-surface-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
                        <Truck size={14} className="text-pink-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-surface-700">{s.name}</p>
                        <p className="text-xs text-surface-400">{s.contactName ?? s.phone ?? t.dashboard.noContact}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.isActive ? "bg-emerald-100 text-emerald-700" : "bg-surface-100 text-surface-500"}`}>
                      {s.isActive ? t.common.active : t.common.inactive}
                    </span>
                  </div>
                ))}
              </div>
            )
          }
        </Section>
      </div>

      {/* ── Pending Cheques ── */}
      <div id="pending-cheques">
      <Section title={t.dashboard.pendingCheques} sub={pendingCheques && pendingCheques.length > 0 ? `${pendingCheques.length} cheque${pendingCheques.length !== 1 ? "s" : ""} · ${fmt(chequesTotal)} total${overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}` : t.dashboard.pendingChequesSub} icon={CreditCard} iconColor={hasUrgent ? "text-red-500" : hasDueSoon ? "text-orange-500" : "text-amber-500"}>
        {!pendingCheques || pendingCheques.length === 0
          ? <Empty icon={CreditCard} label={t.dashboard.noPendingCheques} />
          : (
            <div className="space-y-0">
              {pendingCheques.map((c, idx) => {
                const urgency = chequeUrgency[idx];
                const daysLabel = (() => {
                  if (!c.chequeDate) return null;
                  const d = new Date(c.chequeDate); d.setHours(0, 0, 0, 0);
                  const diff = Math.floor((d.getTime() - today.getTime()) / 86_400_000);
                  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, cls: "bg-red-100 text-red-700" };
                  if (diff === 0) return { label: "Due today",              cls: "bg-orange-100 text-orange-700" };
                  if (diff <= 3) return { label: `Due in ${diff}d`,         cls: "bg-orange-100 text-orange-700" };
                  return { label: `Due ${new Date(c.chequeDate).toLocaleDateString()}`, cls: "bg-amber-100 text-amber-700" };
                })();
                const iconBg = urgency === "overdue" ? "bg-red-50" : urgency === "dueSoon" ? "bg-orange-50" : "bg-amber-50";
                const iconCl = urgency === "overdue" ? "text-red-500" : urgency === "dueSoon" ? "text-orange-500" : "text-amber-500";
                const rowBg  = urgency === "overdue" ? "bg-red-50/40" : urgency === "dueSoon" ? "bg-orange-50/30" : "";
                return (
                  <div key={c.id} className={`flex items-center justify-between py-3 px-2 rounded-lg border-b border-surface-50 last:border-0 ${rowBg}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                        <CreditCard size={14} className={iconCl} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-surface-700">{c.supplier?.name ?? t.dashboard.noSupplier}</p>
                        <p className="text-xs text-surface-400">
                          {t.dashboard.chequeNo} {c.chequeNumber ?? "—"}
                          {c.chequeBank ? ` · ${c.chequeBank}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {daysLabel && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${daysLabel.cls}`}>{daysLabel.label}</span>
                      )}
                      <p className="text-sm font-bold text-surface-800">{fmt(c.amount)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </Section>
      </div>

      {/* ── Row: Purchase Orders + Recent Orders ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Purchase Orders */}
        <Section title={t.purchaseOrders.title} sub={`${draftPOs} ${t.dashboard.purchaseOrdersSub} · ${pendingPOs} ${t.dashboard.purchaseOrdersOrdered}`} icon={ClipboardList} iconColor="text-cyan-500">
          {!purchaseOrders || purchaseOrders.length === 0
            ? <Empty icon={ClipboardList} label={t.dashboard.noPurchaseOrders} />
            : (
              <>
                <div className="space-y-0">
                  {purchaseOrders.slice(0, 5).map(po => {
                    const statusColor: Record<string, string> = {
                      draft:     "bg-surface-100 text-surface-600",
                      ordered:   "bg-blue-100 text-blue-700",
                      received:  "bg-emerald-100 text-emerald-700",
                      cancelled: "bg-red-100 text-red-600",
                    };
                    return (
                      <div key={po.id} className="flex items-center justify-between py-3 border-b border-surface-50 last:border-0">
                        <div>
                          <p className="text-sm font-mono font-semibold text-surface-700">{po.poNumber}</p>
                          <p className="text-xs text-surface-400">{po.supplier?.name ?? t.dashboard.noSupplier}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full ${statusColor[po.status] ?? "bg-surface-100 text-surface-500"}`}>
                            {po.status}
                          </span>
                          <p className="text-sm font-bold text-surface-800">{fmt(po.totalAmount)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-surface-100 flex justify-between text-sm">
                  <span className="text-surface-400">{t.dashboard.totalPOSpend}</span>
                  <span className="font-bold text-surface-800">{fmt(totalPOSpend)}</span>
                </div>
              </>
            )
          }
        </Section>

        {/* Recent Orders */}
        <Section title={t.dashboard.recentOrders} sub={t.dashboard.recentOrdersSub} icon={ShoppingCart} iconColor="text-indigo-500">
          {!recentOrders || recentOrders.length === 0
            ? <Empty icon={ShoppingCart} label={t.dashboard.noCompletedOrders} />
            : (
              <div className="space-y-0">
                {recentOrders.map(order => {
                  const method = order.paymentMethod ?? "cash";
                  const methodBg: Record<string, string> = {
                    cash: "bg-emerald-50 text-emerald-700",
                    card: "bg-indigo-50 text-indigo-700",
                    credit_card: "bg-blue-50 text-blue-700",
                    debit_card: "bg-sky-50 text-sky-700",
                    cheque: "bg-amber-50 text-amber-700",
                    stripe_terminal: "bg-purple-50 text-purple-700",
                  };
                  return (
                    <div key={order.id} className="flex items-center justify-between py-3 border-b border-surface-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <ShoppingCart size={13} className="text-indigo-500" />
                        </div>
                        <div>
                          <p className="text-sm font-mono font-semibold text-surface-700">{order.orderNumber}</p>
                          <p className="text-xs text-surface-400">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {" · "}{order.items.length} item{order.items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${methodBg[method] ?? "bg-surface-100 text-surface-500"}`}>
                          {paymentLabel[method] ?? method}
                        </span>
                        <p className="font-bold text-surface-800 text-sm">{fmt(order.total)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
        </Section>
      </div>



    </div>
  );
}
