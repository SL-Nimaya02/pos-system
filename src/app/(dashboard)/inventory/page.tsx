"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Box, Search, Zap, TrendingDown, AlertTriangle, Package,
  CalendarClock, Layers, Trash2, ChevronDown, ChevronRight,
  ShieldAlert, Clock, CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/contexts/language-context";

type VelocityFilter = "all" | "fast" | "slow" | "dead";
type MainView = "products" | "batches";

const VELOCITY_META = {
  fast: { label: "Fast Moving",  badge: "bg-emerald-100 text-emerald-700", icon: Zap,          desc: "≥ 10 units sold in 30 days" },
  slow: { label: "Slow Moving",  badge: "bg-amber-100 text-amber-600",    icon: TrendingDown,  desc: "1–9 units sold in 30 days" },
  dead: { label: "Dead Stock",   badge: "bg-red-100 text-red-600",         icon: AlertTriangle, desc: "0 units sold in 30 days" },
};

function expiryStatus(expiryDate: Date | string | null) {
  if (!expiryDate) return { label: "No expiry", color: "bg-surface-100 text-surface-500", icon: null, priority: 3 };
  const d = new Date(expiryDate);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)   return { label: "Expired",           color: "bg-red-100 text-red-700",     icon: "expired",  priority: 0 };
  if (diffDays <= 7)  return { label: `${diffDays}d left`, color: "bg-red-50 text-red-600",       icon: "critical", priority: 1 };
  if (diffDays <= 30) return { label: `${diffDays}d left`, color: "bg-amber-100 text-amber-700",  icon: "warning",  priority: 2 };
  return                     { label: `${diffDays}d left`, color: "bg-green-100 text-green-700",  icon: "ok",       priority: 3 };
}

export default function InventoryPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [velocityFilter, setVelocityFilter] = useState<VelocityFilter>("all");
  const [mainView, setMainView] = useState<MainView>("products");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [writeOffQty, setWriteOffQty] = useState<Record<string, string>>({});
  const utils = trpc.useUtils();

  const { data: products, isLoading } = trpc.products.list.useQuery({ activeOnly: false });
  const { data: velocityData } = trpc.products.stockVelocity.useQuery();
  const { data: allBatches, isLoading: batchesLoading } = trpc.batches.listAll.useQuery();
  const { data: expiringBatches } = trpc.batches.listExpiring.useQuery({ withinDays: 30 });

  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => { utils.products.list.invalidate(); toast.success("Stock updated!"); },
    onError: (e) => toast.error(e.message),
  });

  const writeOff = trpc.batches.writeOff.useMutation({
    onSuccess: (d) => {
      utils.batches.listAll.invalidate();
      utils.batches.listExpiring.invalidate();
      utils.products.list.invalidate();
      toast.success(`Written off ${d.writtenOff} unit(s)`);
    },
    onError: (e) => toast.error(e.message),
  });

  const velocityMap = Object.fromEntries((velocityData ?? []).map((v) => [v.id, v]));

  const stockBadge = (stock: number) => {
    if (stock === 0) return "bg-red-100 text-red-600";
    if (stock <= 5)  return "bg-amber-100 text-amber-600";
    return "bg-green-100 text-green-700";
  };
  const stockLabel = (stock: number) => {
    if (stock === 0) return t.inventory.outOfStock;
    if (stock <= 5)  return t.inventory.lowStock;
    return t.inventory.inStock;
  };

  const filtered = (products ?? []).filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (velocityFilter === "all") return true;
    return (velocityMap[p.id]?.velocity ?? "dead") === velocityFilter;
  });

  const counts = {
    all:  (products ?? []).length,
    fast: (velocityData ?? []).filter((v) => v.velocity === "fast").length,
    slow: (velocityData ?? []).filter((v) => v.velocity === "slow").length,
    dead: (velocityData ?? []).filter((v) => v.velocity === "dead").length,
  };

  const tabs: { key: VelocityFilter; label: string; icon: React.ElementType; color: string }[] = [
    { key: "all",  label: "All Stock",   icon: Package,       color: "text-surface-600" },
    { key: "fast", label: "Fast Moving", icon: Zap,           color: "text-emerald-600" },
    { key: "slow", label: "Slow Moving", icon: TrendingDown,  color: "text-amber-600"   },
    { key: "dead", label: "Dead Stock",  icon: AlertTriangle, color: "text-red-600"     },
  ];

  const expiredBatches  = (expiringBatches ?? []).filter(b => expiryStatus(b.expiryDate).priority === 0);
  const criticalBatches = (expiringBatches ?? []).filter(b => expiryStatus(b.expiryDate).priority === 1);
  const warningBatches  = (expiringBatches ?? []).filter(b => expiryStatus(b.expiryDate).priority === 2);

  const batchesByProduct: Record<string, typeof allBatches> = {};
  (allBatches ?? []).forEach(b => { (batchesByProduct[b.productId] ??= []).push(b); });

  return (
    <div className="p-6 space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <Box size={24} className="text-brand-600" /> {t.inventory.title}
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            {mainView === "products"
              ? `${filtered.length} ${t.inventory.productsCount}`
              : `${(allBatches ?? []).filter(b => b.quantityRemaining > 0).length} active batches in FEFO order`}
          </p>
        </div>
        {/* Main view toggle */}
        <div className="flex gap-1 bg-surface-100 p-1 rounded-xl">
          <button
            onClick={() => setMainView("products")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mainView === "products" ? "bg-white shadow text-surface-900" : "text-surface-500 hover:text-surface-700"
            }`}
          >
            <Package size={13} /> Products
          </button>
          <button
            onClick={() => setMainView("batches")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mainView === "batches" ? "bg-white shadow text-surface-900" : "text-surface-500 hover:text-surface-700"
            }`}
          >
            <Layers size={13} /> Batch Stock (FEFO)
            {(expiredBatches.length + criticalBatches.length) > 0 && (
              <span className="ml-0.5 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                {expiredBatches.length + criticalBatches.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Expiry alert banner ── */}
      {(expiredBatches.length > 0 || criticalBatches.length > 0 || warningBatches.length > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap gap-4 items-start">
          <ShieldAlert size={20} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-800 text-sm mb-2">Batch Expiry Alerts</p>
            <div className="flex flex-wrap gap-3">
              {expiredBatches.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-red-100 text-red-700 px-3 py-1.5 rounded-full">
                  <AlertTriangle size={12} /> {expiredBatches.length} batch{expiredBatches.length > 1 ? "es" : ""} EXPIRED
                </span>
              )}
              {criticalBatches.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-red-50 text-red-600 px-3 py-1.5 rounded-full">
                  <Clock size={12} /> {criticalBatches.length} expiring within 7 days
                </span>
              )}
              {warningBatches.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full">
                  <CalendarClock size={12} /> {warningBatches.length} expiring within 30 days
                </span>
              )}
            </div>
            <p className="text-xs text-amber-600 mt-2">Use FEFO — deplete these batches before accepting new stock.</p>
          </div>
        </div>
      )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PRODUCTS VIEW
      ══════════════════════════════════════════════════════════════ */}
      {mainView === "products" && (
        <>
          {/* Velocity summary cards */}
          {velocityData && (
            <div className="grid grid-cols-3 gap-4">
              {(["fast", "slow", "dead"] as const).map((key) => {
                const meta = VELOCITY_META[key];
                const Icon = meta.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setVelocityFilter(velocityFilter === key ? "all" : key)}
                    className={`card p-4 text-left transition-all hover:shadow-md ${velocityFilter === key ? "ring-2 ring-brand-400" : ""}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta.badge}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-surface-800 text-sm">{meta.label}</p>
                        <p className="text-xs text-surface-400">{meta.desc}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-extrabold text-surface-900">{counts[key]}</p>
                    <p className="text-xs text-surface-400 mt-0.5">products</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Search + tabs */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative max-w-sm w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                className="input pl-9"
                placeholder={t.inventory.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1 bg-surface-100 p-1 rounded-xl">
              {tabs.map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => setVelocityFilter(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    velocityFilter === key ? "bg-white shadow text-surface-900" : "text-surface-500 hover:text-surface-700"
                  }`}
                >
                  <Icon size={13} className={velocityFilter === key ? color : ""} />
                  {label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    velocityFilter === key ? "bg-surface-100 text-surface-600" : "bg-surface-200 text-surface-500"
                  }`}>{counts[key]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table with expandable batch rows */}
          <div className="card overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-surface-400 text-sm">{t.inventory.loadingInventory}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="w-6 px-2 py-3" />
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.products.productName}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.inventory.category}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">{t.inventory.price}</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">{t.products.stock}</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">30-Day Sales</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Velocity</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Next Expiry</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">{t.common.status}</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">{t.inventory.adjust}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filtered.map((p) => {
                    const vel = velocityMap[p.id];
                    const vmeta = vel ? VELOCITY_META[vel.velocity] : null;
                    const VIcon = vmeta?.icon;
                    const pBatches = batchesByProduct[p.id] ?? [];
                    const activeBatches = pBatches.filter(b => b.quantityRemaining > 0);
                    const nextExpiry = activeBatches
                      .filter(b => b.expiryDate)
                      .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime())[0];
                    const expStatus = nextExpiry ? expiryStatus(nextExpiry.expiryDate) : null;
                    const isExpanded = expandedProduct === p.id;
                    const hasExpiring = activeBatches.some(b => b.expiryDate && expiryStatus(b.expiryDate).priority <= 1);

                    return (
                      <>
                        <tr key={p.id} className={`hover:bg-surface-50 ${hasExpiring ? "bg-red-50/30" : ""}`}>
                          <td className="px-2 py-3 text-center">
                            {pBatches.length > 0 && (
                              <button
                                onClick={() => setExpandedProduct(isExpanded ? null : p.id)}
                                className="text-surface-400 hover:text-brand-500 transition-colors"
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {hasExpiring && <ShieldAlert size={13} className="text-red-500 flex-shrink-0" />}
                              <div>
                                <p className="font-medium text-surface-800">{p.name}</p>
                                {p.sku && <p className="text-xs text-surface-400">SKU: {p.sku}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-surface-500">{p.category?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold text-brand-600">LKR {parseFloat(p.price).toFixed(2)}</td>
                          <td className="px-4 py-3 text-center font-bold text-surface-800">{p.stock}</td>
                          <td className="px-4 py-3 text-center text-surface-700 font-medium">{vel ? `${vel.unitsSold30d} units` : "—"}</td>
                          <td className="px-4 py-3 text-center">
                            {vmeta && VIcon ? (
                              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${vmeta.badge}`}>
                                <VIcon size={11} /> {vmeta.label}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {expStatus ? (
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${expStatus.color}`}>
                                {nextExpiry?.expiryDate
                                  ? new Date(nextExpiry.expiryDate).toLocaleDateString("en-LK", { day: "2-digit", month: "short", year: "numeric" })
                                  : "—"}
                              </span>
                            ) : <span className="text-xs text-surface-400">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${stockBadge(p.stock)}`}>
                              {stockLabel(p.stock)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => updateProduct.mutate({ id: p.id, stock: Math.max(0, p.stock - 1) })}
                                className="w-7 h-7 rounded-lg bg-surface-100 hover:bg-red-100 hover:text-red-600 text-surface-600 flex items-center justify-center font-bold text-lg transition-colors"
                              >−</button>
                              <button
                                onClick={() => updateProduct.mutate({ id: p.id, stock: p.stock + 1 })}
                                className="w-7 h-7 rounded-lg bg-surface-100 hover:bg-green-100 hover:text-green-600 text-surface-600 flex items-center justify-center font-bold text-lg transition-colors"
                              >+</button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded batch sub-rows */}
                        {isExpanded && (
                          <tr key={`${p.id}-batches`} className="bg-indigo-50/40">
                            <td colSpan={10} className="px-6 py-3">
                              <p className="text-xs font-semibold text-surface-600 mb-2 flex items-center gap-1.5">
                                <Layers size={12} className="text-brand-500" />
                                Batches in FEFO order — deplete oldest expiry first
                              </p>
                              <div className="overflow-x-auto rounded-lg border border-surface-200 bg-white">
                                <table className="w-full text-xs">
                                  <thead className="bg-surface-50 border-b border-surface-100">
                                    <tr>
                                      <th className="text-left px-4 py-2 font-semibold text-surface-500">Batch #</th>
                                      <th className="text-left px-4 py-2 font-semibold text-surface-500">Received</th>
                                      <th className="text-left px-4 py-2 font-semibold text-surface-500">Expires</th>
                                      <th className="text-center px-4 py-2 font-semibold text-surface-500">Received Qty</th>
                                      <th className="text-center px-4 py-2 font-semibold text-surface-500">Remaining</th>
                                      <th className="text-center px-4 py-2 font-semibold text-surface-500">Status</th>
                                      <th className="text-center px-4 py-2 font-semibold text-surface-500">Write-off</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-surface-50">
                                    {pBatches.map((b, idx) => {
                                      const es = expiryStatus(b.expiryDate);
                                      const isDepleted = b.quantityRemaining === 0;
                                      return (
                                        <tr key={b.id} className={isDepleted ? "opacity-40" : ""}>
                                          <td className="px-4 py-2 font-medium text-surface-700">
                                            {idx === 0 && !isDepleted && (
                                              <span className="mr-1.5 inline-flex items-center bg-brand-100 text-brand-700 text-[10px] font-bold px-1.5 py-0.5 rounded">NEXT</span>
                                            )}
                                            {b.batchNumber ?? `Batch ${idx + 1}`}
                                          </td>
                                          <td className="px-4 py-2 text-surface-500">{new Date(b.receivedDate).toLocaleDateString("en-LK", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                          <td className="px-4 py-2 text-surface-500">{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString("en-LK", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                                          <td className="px-4 py-2 text-center text-surface-600">{b.quantityReceived}</td>
                                          <td className="px-4 py-2 text-center font-bold text-surface-800">{b.quantityRemaining}</td>
                                          <td className="px-4 py-2 text-center">
                                            {isDepleted ? (
                                              <span className="inline-flex items-center gap-1 bg-surface-100 text-surface-400 px-2 py-0.5 rounded-full"><CheckCircle2 size={10} /> Depleted</span>
                                            ) : (
                                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${es.color}`}>{es.label}</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-2 text-center">
                                            {!isDepleted && (
                                              <div className="flex items-center justify-center gap-1">
                                                <input
                                                  type="number" min={1} max={b.quantityRemaining}
                                                  value={writeOffQty[b.id] ?? ""}
                                                  onChange={e => setWriteOffQty(q => ({ ...q, [b.id]: e.target.value }))}
                                                  placeholder="qty"
                                                  className="w-14 border border-surface-200 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:border-brand-400"
                                                />
                                                <button
                                                  onClick={() => {
                                                    const qty = parseInt(writeOffQty[b.id] ?? "0");
                                                    if (!qty || qty < 1) return toast.error("Enter a quantity");
                                                    if (confirm(`Write off ${qty} unit(s) from this batch?`)) writeOff.mutate({ batchId: b.id, quantity: qty });
                                                  }}
                                                  disabled={writeOff.isPending}
                                                  title="Write off / dispose"
                                                  className="p-1.5 rounded bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors disabled:opacity-40"
                                                ><Trash2 size={12} /></button>
                                              </div>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
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
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          BATCH STOCK (FEFO) VIEW
      ══════════════════════════════════════════════════════════════ */}
      {mainView === "batches" && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="card p-4 border-l-4 border-red-400">
              <p className="text-xs text-surface-500 font-medium mb-1">Expired (in stock)</p>
              <p className="text-2xl font-extrabold text-red-600">{expiredBatches.length}</p>
              <p className="text-xs text-red-400 mt-0.5">Dispose immediately</p>
            </div>
            <div className="card p-4 border-l-4 border-orange-400">
              <p className="text-xs text-surface-500 font-medium mb-1">Expiring ≤ 7 days</p>
              <p className="text-2xl font-extrabold text-orange-600">{criticalBatches.length}</p>
              <p className="text-xs text-orange-400 mt-0.5">Sell before restocking</p>
            </div>
            <div className="card p-4 border-l-4 border-amber-400">
              <p className="text-xs text-surface-500 font-medium mb-1">Expiring ≤ 30 days</p>
              <p className="text-2xl font-extrabold text-amber-600">{warningBatches.length}</p>
              <p className="text-xs text-amber-400 mt-0.5">Monitor closely</p>
            </div>
            <div className="card p-4 border-l-4 border-brand-400">
              <p className="text-xs text-surface-500 font-medium mb-1">Total Active Batches</p>
              <p className="text-2xl font-extrabold text-brand-600">{(allBatches ?? []).filter(b => b.quantityRemaining > 0).length}</p>
              <p className="text-xs text-surface-400 mt-0.5">Across all products</p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-100 bg-surface-50 flex items-center gap-2">
              <Layers size={15} className="text-brand-500" />
              <span className="font-semibold text-surface-800 text-sm">All Batches — FEFO Order</span>
              <span className="text-xs text-surface-400 ml-1">(oldest expiry first — finish these before restocking)</span>
            </div>
            {batchesLoading ? (
              <div className="p-8 text-center text-surface-400 text-sm">Loading batches...</div>
            ) : (allBatches ?? []).length === 0 ? (
              <div className="p-12 text-center">
                <Layers size={32} className="text-surface-200 mx-auto mb-3" />
                <p className="text-surface-400 text-sm font-medium">No batch records yet</p>
                <p className="text-surface-300 text-xs mt-1">Batches are created automatically when you receive stock via GRN (Stock In).</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500 w-12">Order</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Batch #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Received</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Expires</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Remaining</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Expiry Status</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Write-off</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {(allBatches ?? []).map((b, idx) => {
                    const es = expiryStatus(b.expiryDate);
                    const isDepleted = b.quantityRemaining === 0;
                    return (
                      <tr key={b.id} className={`hover:bg-surface-50 ${isDepleted ? "opacity-40" : ""} ${es.priority === 0 ? "bg-red-50/40" : es.priority === 1 ? "bg-orange-50/30" : ""}`}>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${idx === 0 && !isDepleted ? "bg-brand-600 text-white" : "bg-surface-100 text-surface-500"}`}>{idx + 1}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-surface-800">{b.product?.name ?? "—"}</p>
                          {b.product?.sku && <p className="text-xs text-surface-400">SKU: {b.product.sku}</p>}
                        </td>
                        <td className="px-4 py-3 text-surface-600 font-mono text-xs">{b.batchNumber ?? <span className="text-surface-300 italic">—</span>}</td>
                        <td className="px-4 py-3 text-surface-500 text-xs">{new Date(b.receivedDate).toLocaleDateString("en-LK", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td className="px-4 py-3 text-surface-500 text-xs">{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString("en-LK", { day: "2-digit", month: "short", year: "numeric" }) : <span className="text-surface-300 italic">No expiry</span>}</td>
                        <td className="px-4 py-3 text-center font-bold text-surface-800">{b.quantityRemaining}</td>
                        <td className="px-4 py-3 text-center">
                          {isDepleted ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-surface-100 text-surface-400 px-2 py-1 rounded-full"><CheckCircle2 size={11} /> Depleted</span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${es.color}`}>
                              {es.icon === "expired"  && <AlertTriangle size={11} />}
                              {es.icon === "critical" && <Clock size={11} />}
                              {es.icon === "warning"  && <CalendarClock size={11} />}
                              {es.icon === "ok"       && <CheckCircle2 size={11} />}
                              {es.label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {!isDepleted && (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number" min={1} max={b.quantityRemaining}
                                value={writeOffQty[b.id] ?? ""}
                                onChange={e => setWriteOffQty(q => ({ ...q, [b.id]: e.target.value }))}
                                placeholder="qty"
                                className="w-14 border border-surface-200 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:border-brand-400"
                              />
                              <button
                                onClick={() => {
                                  const qty = parseInt(writeOffQty[b.id] ?? "0");
                                  if (!qty || qty < 1) return toast.error("Enter a quantity");
                                  if (confirm(`Write off ${qty} unit(s) from this batch?`)) writeOff.mutate({ batchId: b.id, quantity: qty });
                                }}
                                disabled={writeOff.isPending}
                                title="Write off / dispose"
                                className="p-1.5 rounded bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors disabled:opacity-40"
                              ><Trash2 size={13} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
