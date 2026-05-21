"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  DollarSign, ShoppingCart, Package, TrendingUp,
  Users, Truck, ClipboardList, AlertTriangle, Clock,
  CreditCard, Zap, Star, Activity, ArrowUpRight, ArrowDownRight,
  CheckCircle, XCircle, RefreshCw, CalendarDays, Calendar,
  Banknote, Wallet,
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
  const { t } = useLanguage();
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  useEffect(() => { setLastUpdated(new Date()); }, []);
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
      utils.finance.cashFlow.invalidate(),
    ]);
    setLastUpdated(new Date());
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

  // ── Derived values ──
  const lowStock    = activeProducts?.filter(p => p.stock <= 5) ?? [];
  const outOfStock  = activeProducts?.filter(p => p.stock === 0).length ?? 0;
  const activeSup   = suppliers?.filter(s => s.isActive).length ?? 0;
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
    totalOut: d.totalOut,
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

  // ── KPI cards ──
  const stats = [
    { label: t.dashboard.todayRevenue,   value: isLoading ? "—" : fmt(summary?.total_revenue ?? "0"),    sub: t.dashboard.completedSales,      icon: DollarSign,    gradient: "from-indigo-500 to-purple-600",  glow: "shadow-indigo-200"  },
    { label: "Net Sales",                value: isLoading ? "—" : fmt(summary?.net_sales ?? "0"),         sub: "Excl. tax, after discounts",    icon: ArrowUpRight,  gradient: "from-teal-500 to-emerald-500",   glow: "shadow-teal-200"    },
    { label: t.dashboard.ordersToday,    value: isLoading ? "—" : String(summary?.total_orders ?? "0"),  sub: t.dashboard.completedOrders,     icon: ShoppingCart,  gradient: "from-sky-500 to-cyan-400",       glow: "shadow-sky-200"     },
    { label: t.dashboard.avgOrderValue,  value: isLoading ? "—" : fmt(summary?.avg_order_value ?? "0"),  sub: t.dashboard.perCompletedOrder,   icon: TrendingUp,    gradient: "from-emerald-500 to-teal-400",   glow: "shadow-emerald-200" },
    { label: t.dashboard.totalProducts,  value: allProducts ? String(allProducts.length) : "—",           sub: `${outOfStock} ${t.dashboard.outOfStock}`, icon: Package, gradient: "from-orange-500 to-amber-400",  glow: "shadow-orange-200"  },
    { label: t.dashboard.activeSuppliers, value: String(activeSup),  sub: `${suppliers?.length ?? 0} ${t.dashboard.totalLabel}`,  icon: Truck,          gradient: "from-pink-500 to-rose-400",      glow: "shadow-pink-200"    },
    { label: t.dashboard.staffMembers,   value: String(users?.length ?? "—"), sub: t.users.userManagement, icon: Users,             gradient: "from-violet-500 to-purple-400",  glow: "shadow-violet-200"  },
    { label: t.nav.purchaseOrders,      value: String(purchaseOrders?.length ?? "—"), sub: `${pendingPOs} ${t.dashboard.awaiting}`,   icon: ClipboardList, gradient: "from-cyan-500 to-blue-400",      glow: "shadow-cyan-200"    },
    { label: t.dashboard.categories,     value: String(categories?.length ?? "—"), sub: t.products.tabs.categories,  icon: Star,            gradient: "from-amber-500 to-yellow-400",   glow: "shadow-amber-200"   },
  ];

  return (
    <div className="p-6 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-surface-900 tracking-tight">{t.dashboard.title}</h1>
          <p className="text-sm text-surface-400 mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
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
              <CalendarDays size={13} /> Daily
            </button>
            <button
              onClick={() => setPeriod("monthly")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === "monthly" ? "bg-white shadow text-surface-900" : "text-surface-500 hover:text-surface-700"
              }`}
            >
              <Calendar size={13} /> Monthly
            </button>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-2 text-xs text-surface-400">
              <Clock size={13} />
              <span>Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold bg-surface-100 hover:bg-surface-200 text-surface-600 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} /> Refresh
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

      {/* ── Revenue trend (full width) ── */}
      <Section title={t.dashboard.revenueTrend} sub={period === "daily" ? "Last 7 days" : "Last 12 months"} icon={Zap} iconColor="text-indigo-500">
        <RevenueAreaChart data={weeklyData} />
      </Section>

      {/* ── Cash Flow (full width) ── */}
      <Section title="Cash Flow" sub="Last 30 days — inflows vs outflows" icon={Wallet} iconColor="text-emerald-500">
        {/* Summary tiles */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight size={15} className="text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">Total Inflow</span>
            </div>
            <p className="text-xl font-extrabold text-emerald-700">
              {cfTotals ? fmt(cfTotals.totalIn) : "—"}
            </p>
            {cfTotals && (
              <p className="text-xs text-emerald-500 mt-0.5">
                Sales {fmt(cfTotals.salesCash + cfTotals.salesCard + cfTotals.salesOther)} · Other {fmt(cfTotals.income + cfTotals.cashIn)}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-red-50 border border-red-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownRight size={15} className="text-red-600" />
              <span className="text-xs font-semibold text-red-700">Total Outflow</span>
            </div>
            <p className="text-xl font-extrabold text-red-700">
              {cfTotals ? fmt(cfTotals.totalOut) : "—"}
            </p>
            {cfTotals && (
              <p className="text-xs text-red-400 mt-0.5">
                Expenses {fmt(cfTotals.expenses)} · Suppliers {fmt(cfTotals.supplierPayments)}
              </p>
            )}
          </div>
          <div className={`rounded-xl border p-4 ${
            !cfTotals ? "bg-surface-50 border-surface-100" :
            cfTotals.net >= 0 ? "bg-indigo-50 border-indigo-100" : "bg-orange-50 border-orange-100"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Banknote size={15} className={!cfTotals ? "text-surface-500" : cfTotals.net >= 0 ? "text-indigo-600" : "text-orange-600"} />
              <span className={`text-xs font-semibold ${!cfTotals ? "text-surface-600" : cfTotals.net >= 0 ? "text-indigo-700" : "text-orange-700"}`}>Net Cash</span>
            </div>
            <p className={`text-xl font-extrabold ${!cfTotals ? "text-surface-700" : cfTotals.net >= 0 ? "text-indigo-700" : "text-orange-700"}`}>
              {cfTotals ? fmt(cfTotals.net) : "—"}
            </p>
            {cfTotals && (
              <p className={`text-xs mt-0.5 ${cfTotals.net >= 0 ? "text-indigo-400" : "text-orange-400"}`}>
                {cfTotals.net >= 0 ? "Positive cash position" : "Negative — review outflows"}
              </p>
            )}
          </div>
        </div>
        {/* Chart */}
        <CashFlowChart data={cfData} />
        {/* Legend */}
        <div className="flex items-center gap-5 mt-3 justify-center">
          <span className="flex items-center gap-1.5 text-xs text-surface-500">
            <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> Inflow
          </span>
          <span className="flex items-center gap-1.5 text-xs text-surface-500">
            <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Outflow
          </span>
          <span className="flex items-center gap-1.5 text-xs text-surface-500">
            <span className="w-3 h-1 bg-indigo-500 inline-block rounded" /> Net
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
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))}
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
                          <p className="text-xs text-surface-400">{po.supplier?.name ?? "No supplier"}</p>
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

      {/* ── Low Stock full row ── */}
      <Section title={t.dashboard.lowStockAlert} sub={t.dashboard.lowStockAlertSub} icon={AlertTriangle} iconColor="text-amber-500">
        {lowStock.length === 0
          ? <Empty icon={Package} label={t.dashboard.allStocked} />
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStock.map(p => {
                const pct = Math.min(100, Math.round((p.stock / 5) * 100));
                const bar = p.stock === 0 ? "bg-red-500" : p.stock <= 2 ? "bg-orange-400" : "bg-amber-400";
                const badge = p.stock === 0
                  ? "bg-red-100 text-red-600"
                  : "bg-amber-100 text-amber-700";
                return (
                  <div key={p.id} className="border border-surface-100 rounded-xl p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-semibold text-surface-700 leading-tight">{p.name}</p>
                        {p.sku && <p className="text-xs text-surface-400">SKU: {p.sku}</p>}
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg shrink-0 ml-2 ${badge}`}>
                        {p.stock === 0 ? "Out" : `${p.stock} left`}
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

    </div>
  );
}
