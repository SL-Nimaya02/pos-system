"use client";

import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  DollarSign, ShoppingCart, TrendingUp, CalendarDays,
  Banknote, CreditCard, Printer, FileSpreadsheet, TrendingDown, BarChart2,
  Package, Boxes
} from "lucide-react";
import * as XLSX from "xlsx";
import { useLanguage } from "@/contexts/language-context";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function thisMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  return { start, end: todayStr() };
}
function thisYearRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  return { start, end: todayStr() };
}
function lastMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  const end   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
  return { start, end };
}

export default function ReportsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"sales" | "valuation" | "sales-stock">("sales");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate]     = useState(todayStr());
  const printRef = useRef<HTMLDivElement>(null);

  const { data: summary } = trpc.orders.summary.useQuery();
  const { data: orders, isLoading } = trpc.orders.list.useQuery({
    limit: 500,
    status: "completed",
    startDate,
    endDate,
  }, { enabled: activeTab === "sales" });

  const { data: stockValuation, isLoading: valLoading } = trpc.products.stockValueReport.useQuery(undefined, { enabled: activeTab === "valuation" });
  const { data: salesStock, isLoading: ssLoading } = trpc.products.salesStockSummary.useQuery({ startDate, endDate }, { enabled: activeTab === "sales-stock" });

  const { data: pnl, isLoading: pnlLoading } = trpc.orders.pnl.useQuery({
    startDate,
    endDate,
  }, { enabled: activeTab === "sales" });

  const { data: cashFlow } = trpc.finance.cashFlow.useQuery({ startDate, endDate }, { enabled: activeTab === "sales" });

  // P&L derived values
  const netSales         = parseFloat(pnl?.net_sales          ?? "0");
  const cogs             = parseFloat(pnl?.cogs               ?? "0");
  const taxCollected     = parseFloat(pnl?.tax_collected      ?? "0");
  const discountsGiven   = parseFloat(pnl?.discounts_given    ?? "0");
  const grossRevenue     = parseFloat(pnl?.gross_revenue      ?? "0");
  const totalExpenses    = parseFloat(pnl?.total_expenses     ?? "0");
  const totalOtherIncome = parseFloat(pnl?.total_other_income ?? "0");
  const grossProfit      = netSales - cogs;
  const grossMargin      = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
  const netProfit        = grossProfit + totalOtherIncome - totalExpenses;
  const netMargin        = netSales > 0 ? (netProfit / netSales) * 100 : 0;
  const itemsMissingCost = pnl?.items_missing_cost ?? 0;

  const filteredRevenue = orders?.reduce((s, o) => s + parseFloat(o.total), 0) ?? 0;
  const filteredTax     = orders?.reduce((s, o) => s + parseFloat(o.taxAmount ?? "0"), 0) ?? 0;
  const filteredCount   = orders?.length ?? 0;
  const filteredAvg     = filteredCount > 0 ? filteredRevenue / filteredCount : 0;
  const cashCount       = orders?.filter((o) => o.paymentMethod === "cash").length ?? 0;
  const cardCount       = orders?.filter((o) => o.paymentMethod === "card").length ?? 0;
  const cashRevenue     = orders?.filter((o) => o.paymentMethod === "cash").reduce((s, o) => s + parseFloat(o.total), 0) ?? 0;
  const cardRevenue     = orders?.filter((o) => o.paymentMethod === "card").reduce((s, o) => s + parseFloat(o.total), 0) ?? 0;

  const presets = [
    { label: "Today",       start: todayStr(), end: todayStr() },
    { label: "This Month",  ...thisMonthRange() },
    { label: "Last Month",  ...lastMonthRange() },
    { label: "This Year",   ...thisYearRange() },
    { label: "Last 7 days", start: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), end: todayStr() },
    { label: "Last 30 days",start: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), end: todayStr() },
  ];

  // ── Excel Export ──────────────────────────────────────────────────────────
  function exportExcel() {
    if (activeTab === "sales") {
      if (!orders?.length) return;
      const summaryData = [
        ["Sales Report", `${startDate} to ${endDate}`],
        [],
        ["Metric", "Value"],
        ["Total Revenue (LKR)", filteredRevenue.toFixed(2)],
        ["Total Orders",        filteredCount],
        ["Average Order (LKR)", filteredAvg.toFixed(2)],
        ["Tax Collected (LKR)", filteredTax.toFixed(2)],
        ["Cash Orders",         cashCount],
        ["Card Orders",         cardCount],
        ["Cash Revenue (LKR)",  cashRevenue.toFixed(2)],
        ["Card Revenue (LKR)",  cardRevenue.toFixed(2)],
      ];

      const ordersData = [
        ["Order #", "Date", "Time", "Items", "Payment Method", "Subtotal (LKR)", "Tax (LKR)", "Discount (LKR)", "Total (LKR)"],
        ...orders.map((o) => [
          o.orderNumber,
          new Date(o.createdAt).toLocaleDateString(),
          new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          o.items.length,
          o.paymentMethod,
          parseFloat(o.subtotal).toFixed(2),
          parseFloat(o.taxAmount ?? "0").toFixed(2),
          parseFloat(o.discountAmount ?? "0").toFixed(2),
          parseFloat(o.total).toFixed(2),
        ]),
        [],
        ["", "", "", "", "TOTAL", "", "", "", filteredRevenue.toFixed(2)],
      ];

      const lineItemsData = [
        ["Order #", "Product", "Qty", "Unit Price (LKR)", "Line Total (LKR)"],
        ...orders.flatMap((o) =>
          o.items.map((item) => [
            o.orderNumber,
            item.productName,
            item.quantity,
            parseFloat(item.productPrice).toFixed(2),
            parseFloat(item.subtotal).toFixed(2),
          ])
        ),
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData),   "Summary");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ordersData),    "Orders");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lineItemsData), "Line Items");

      const pnlSheetData = [
        ["Profit & Loss Statement", `${startDate} to ${endDate}`],
        [],
        ["Line Item",                        "Amount (LKR)"],
        ["Gross Revenue (incl. tax)",         grossRevenue.toFixed(2)],
        ["Less: Tax Collected",              `-${taxCollected.toFixed(2)}`],
        ["Less: Discounts Given",            `-${discountsGiven.toFixed(2)}`],
        ["Net Sales",                         netSales.toFixed(2)],
        [],
        ["Less: Cost of Goods Sold (COGS)",  `-${cogs.toFixed(2)}`],
        [],
        ["Gross Profit",                      grossProfit.toFixed(2)],
        ["Gross Margin (%)",                  `${grossMargin.toFixed(1)}%`],
        [],
        ["Add: Other Income",                 totalOtherIncome.toFixed(2)],
        ["Less: Operating Expenses",         `-${totalExpenses.toFixed(2)}`],
        [],
        ["NET PROFIT / (LOSS)",               netProfit.toFixed(2)],
        ["Net Margin (%)",                    `${netMargin.toFixed(1)}%`],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pnlSheetData), "P&L");

      XLSX.writeFile(wb, `sales-report_${startDate}_to_${endDate}.xlsx`);
    } else if (activeTab === "valuation") {
      if (!stockValuation) return;
      const data = [
        ["Stock Valuation Report", new Date().toLocaleString()],
        [],
        ["Product Name", "SKU", "Category", "Current Stock", "Cost Price (LKR)", "Retail Price (LKR)", "Total Cost Value (LKR)", "Total Retail Value (LKR)"],
        ...stockValuation.products.map(p => [
          p.name, p.sku || "-", p.categoryName || "-", p.stock, p.cost || "0", p.price || "0", p.stockValue.toFixed(2), p.retailValue.toFixed(2)
        ]),
        [],
        ["TOTAL", "", "", "", "", "", stockValuation.totalStockValue.toFixed(2), stockValuation.totalRetailValue.toFixed(2)]
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Stock Valuation");
      XLSX.writeFile(wb, `stock-valuation_${todayStr()}.xlsx`);
    } else if (activeTab === "sales-stock") {
      if (!salesStock) return;
      const data = [
        ["Sales vs Stock Summary", `${startDate} to ${endDate}`],
        [],
        ["Product Name", "SKU", "Category", "Units Sold", "Revenue Generated (LKR)", "Current Stock Remaining"],
        ...salesStock.map(p => [
          p.name, p.sku || "-", p.categoryName || "-", p.unitsSold, p.revenueGenerated.toFixed(2), p.currentStock
        ])
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Sales Stock Summary");
      XLSX.writeFile(wb, `sales-stock-summary_${startDate}_to_${endDate}.xlsx`);
    }
  }

  // ── Print ─────────────────────────────────────────────────────────────────
  function handlePrint() {
    window.print();
  }

  const isToday = startDate === todayStr() && endDate === todayStr();

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-report, #print-report * { visibility: visible; }
          #print-report { position: absolute; left: 0; top: 0; right: 0; padding: 24px; font-family: sans-serif; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">{t.reports.title}</h1>
            <p className="text-sm text-surface-400 mt-1">Exportable insights and analytics for your business.</p>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
            >
              <FileSpreadsheet size={15} /> {t.reports.exportExcel}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-surface-800 hover:bg-surface-900 text-white rounded-xl transition-colors"
            >
              <Printer size={15} /> {t.reports.printPDF}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-surface-100 p-1 rounded-xl w-max mb-6 no-print overflow-x-auto max-w-full">
          <button onClick={() => setActiveTab("sales")} className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === "sales" ? "bg-white text-brand-700 shadow-sm" : "text-surface-600 hover:text-surface-900"}`}>
            <BarChart2 size={16}/> Sales & P&L
          </button>
          <button onClick={() => setActiveTab("valuation")} className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === "valuation" ? "bg-white text-brand-700 shadow-sm" : "text-surface-600 hover:text-surface-900"}`}>
            <Boxes size={16}/> Stock Valuation
          </button>
          <button onClick={() => setActiveTab("sales-stock")} className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === "sales-stock" ? "bg-white text-brand-700 shadow-sm" : "text-surface-600 hover:text-surface-900"}`}>
            <Package size={16}/> Sales vs Stock
          </button>
        </div>

        {/* Date Filter */}
        {activeTab !== "valuation" && (
          <div className="card p-4 mb-6 flex flex-wrap items-center gap-3 no-print">
            <CalendarDays size={18} className="text-brand-600 shrink-0" />
            <div className="flex items-center gap-2">
              <input type="date" className="input py-1.5 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <span className="text-surface-400 text-sm">{t.reports.to}</span>
              <input type="date" className="input py-1.5 text-sm" value={endDate}   onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex gap-2 ml-auto overflow-x-auto">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setStartDate(p.start); setEndDate(p.end); }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors whitespace-nowrap ${
                    startDate === p.start && endDate === p.end
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-surface-600 border-surface-200 hover:border-brand-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Printable area */}
        <div id="print-report" ref={printRef}>
          
          {/* ───────────────────────────────────────────────────────── */}
          {/* SALES & P&L TAB */}
          {/* ───────────────────────────────────────────────────────── */}
          {activeTab === "sales" && (
            <>
              <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold">Sales & P&L Report</h1>
                <p className="text-sm text-gray-500">{startDate} to {endDate} · Generated {new Date().toLocaleString()}</p>
                <hr className="my-3" />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { label: t.reports.revenue,   value: `LKR ${filteredRevenue.toFixed(2)}`, icon: DollarSign,  color: "text-brand-600",  bg: "bg-brand-50"  },
                  { label: t.reports.orders,    value: String(filteredCount),               icon: ShoppingCart, color: "text-blue-600",   bg: "bg-blue-50"   },
                  { label: t.reports.avgOrder,  value: `LKR ${filteredAvg.toFixed(2)}`,     icon: TrendingUp,   color: "text-purple-600", bg: "bg-purple-50" },
                  { label: t.customers.cashCard, value: `${cashCount} / ${cardCount}`,       icon: Banknote,     color: "text-amber-600",  bg: "bg-amber-50"  },
                ].map((s) => (
                  <div key={s.label} className="card p-4">
                    <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                      <s.icon size={18} className={s.color} />
                    </div>
                    <p className="text-xs text-surface-400 font-medium">{s.label}</p>
                    <p className="text-lg font-bold text-surface-900 mt-0.5">{isLoading ? "..." : s.value}</p>
                  </div>
                ))}
              </div>

              {/* P&L Statement */}
              <div className="card overflow-hidden mb-6">
                <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
                  <BarChart2 size={18} className="text-brand-600" />
                  <h2 className="font-semibold text-surface-800">{t.reports.pnlTitle}</h2>
                  {!isToday && (
                    <span className="text-xs text-surface-400 ml-1">· {startDate} → {endDate}</span>
                  )}
                </div>

                {pnlLoading ? (
                  <div className="p-8 text-center text-surface-400 text-sm">{t.common.loading}</div>
                ) : (
                  <div className="p-5 space-y-0">
                    <div className="flex items-center justify-between py-3 border-b border-surface-100">
                      <span className="text-sm text-surface-600 flex items-center gap-2">
                        <DollarSign size={14} className="text-brand-500" />
                        {t.reports.grossRevenue}
                      </span>
                      <span className="text-sm font-semibold text-surface-800">LKR {grossRevenue.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-surface-100 pl-4">
                      <span className="text-sm text-surface-500">{t.reports.taxCollected}</span>
                      <span className="text-sm text-red-500">− LKR {taxCollected.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-surface-100 pl-4">
                      <span className="text-sm text-surface-500">{t.reports.discountsGiven}</span>
                      <span className="text-sm text-red-500">− LKR {discountsGiven.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-surface-200 bg-surface-50 -mx-5 px-5">
                      <span className="text-sm font-semibold text-surface-700">{t.reports.netSales}</span>
                      <span className="text-sm font-bold text-surface-800">LKR {netSales.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-surface-100 pl-4">
                      <span className="text-sm text-surface-500 flex items-center gap-2">
                        <TrendingDown size={14} className="text-orange-400" />
                        {t.reports.cogs}
                      </span>
                      <span className="text-sm text-red-500">− LKR {cogs.toFixed(2)}</span>
                    </div>

                    <div className={`flex items-center justify-between py-4 -mx-5 px-5 ${grossProfit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                      <span className={`text-base font-bold flex items-center gap-2 ${grossProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                        <TrendingUp size={16} />
                        {t.reports.grossProfit}
                      </span>
                      <div className="text-right">
                        <p className={`text-base font-bold ${grossProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                          LKR {grossProfit.toFixed(2)}
                        </p>
                        <p className={`text-xs font-medium mt-0.5 ${grossProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {t.reports.grossMargin}: {grossMargin.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-surface-100 pl-4">
                      <span className="text-sm text-surface-500 flex items-center gap-2">
                        <TrendingUp size={14} className="text-green-400" />
                        {t.reports.otherIncome}
                      </span>
                      <span className="text-sm text-green-600">+ LKR {totalOtherIncome.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-surface-100 pl-4">
                      <span className="text-sm text-surface-500 flex items-center gap-2">
                        <TrendingDown size={14} className="text-red-400" />
                        {t.reports.operatingExpenses}
                      </span>
                      <span className="text-sm text-red-500">− LKR {totalExpenses.toFixed(2)}</span>
                    </div>

                    <div className={`flex items-center justify-between py-4 -mx-5 px-5 rounded-b-xl ${netProfit >= 0 ? "bg-brand-50" : "bg-red-50"}`}>
                      <span className={`text-lg font-bold flex items-center gap-2 ${netProfit >= 0 ? "text-brand-700" : "text-red-700"}`}>
                        <TrendingUp size={18} />
                        {netProfit >= 0 ? t.reports.netProfit : t.reports.netLoss}
                      </span>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${netProfit >= 0 ? "text-brand-700" : "text-red-700"}`}>
                          LKR {netProfit.toFixed(2)}
                        </p>
                        <p className={`text-xs font-medium mt-0.5 ${netProfit >= 0 ? "text-brand-600" : "text-red-600"}`}>
                          {t.reports.netMargin}: {netMargin.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {itemsMissingCost > 0 && (
                      <p className="text-xs text-amber-600 pt-3">{t.reports.partialCogs}</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}


          {/* ───────────────────────────────────────────────────────── */}
          {/* STOCK VALUATION TAB */}
          {/* ───────────────────────────────────────────────────────── */}
          {activeTab === "valuation" && (
            <>
              <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold">Stock Valuation Report</h1>
                <p className="text-sm text-gray-500">Generated {new Date().toLocaleString()}</p>
                <hr className="my-3" />
              </div>
              
              {valLoading ? (
                <div className="p-12 text-center text-surface-400">Loading valuation data...</div>
              ) : !stockValuation ? null : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="card p-5 bg-gradient-to-br from-indigo-50 to-white">
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Total Value (At Cost)</p>
                      <p className="text-3xl font-black text-surface-900 mt-2">LKR {stockValuation.totalStockValue.toFixed(2)}</p>
                    </div>
                    <div className="card p-5 bg-gradient-to-br from-emerald-50 to-white">
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Potential Retail Value</p>
                      <p className="text-3xl font-black text-surface-900 mt-2">LKR {stockValuation.totalRetailValue.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {stockValuation.missingCost > 0 && (
                    <div className="mb-4 bg-amber-50 text-amber-800 p-3 rounded-lg text-sm font-medium border border-amber-200">
                      ⚠️ {stockValuation.missingCost} products are missing a cost price. Cost valuation may be inaccurate.
                    </div>
                  )}

                  <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-surface-50 border-b border-surface-200">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Product</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Category</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Qty in Stock</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Cost Price</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Retail Price</th>
                            <th className="text-right px-4 py-3 text-xs font-bold text-indigo-700 uppercase tracking-wider">Total Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                          {stockValuation.products.map(p => (
                            <tr key={p.id} className="hover:bg-surface-50">
                              <td className="px-4 py-3 font-semibold text-surface-800">
                                {p.name}
                                {p.sku && <div className="text-xs font-normal text-surface-400 mt-0.5">{p.sku}</div>}
                              </td>
                              <td className="px-4 py-3">
                                {p.categoryName ? (
                                  <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-surface-100 text-surface-600">
                                    {p.categoryName}
                                  </span>
                                ) : (
                                  <span className="text-surface-300 text-xs">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-surface-700">{p.stock}</td>
                              <td className="px-4 py-3 text-right text-surface-600">{parseFloat(p.cost || "0").toFixed(2)}</td>
                              <td className="px-4 py-3 text-right text-surface-600">{parseFloat(p.price || "0").toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-bold text-indigo-700 bg-indigo-50/30">
                                {p.stockValue.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* SALES VS STOCK TAB */}
          {/* ───────────────────────────────────────────────────────── */}
          {activeTab === "sales-stock" && (
            <>
              <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold">Sales vs Stock Summary</h1>
                <p className="text-sm text-gray-500">{startDate} to {endDate} · Generated {new Date().toLocaleString()}</p>
                <hr className="my-3" />
              </div>
              
              {ssLoading ? (
                <div className="p-12 text-center text-surface-400">Loading sales vs stock data...</div>
              ) : !salesStock ? null : (
                <div className="card overflow-hidden">
                  <div className="px-5 py-4 border-b border-surface-100 bg-surface-50">
                    <p className="text-sm text-surface-600">Product performance for the selected period compared to current inventory on hand.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-50 border-b border-surface-200">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Product</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Units Sold</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Revenue Generated (LKR)</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Stock Remaining</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100">
                        {salesStock.map(p => {
                          let statusColor = "bg-green-100 text-green-700";
                          let statusText = "Healthy";
                          if (p.currentStock <= 0) {
                            statusColor = "bg-red-100 text-red-700";
                            statusText = "Out of Stock";
                          } else if (p.currentStock <= 5) {
                            statusColor = "bg-orange-100 text-orange-700";
                            statusText = "Low Stock";
                          } else if (p.unitsSold === 0) {
                            statusColor = "bg-surface-100 text-surface-600";
                            statusText = "No Sales";
                          }

                          return (
                            <tr key={p.id} className="hover:bg-surface-50">
                              <td className="px-4 py-3 font-semibold text-surface-800">
                                {p.name}
                                {p.categoryName && <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-surface-100 text-surface-500">{p.categoryName}</span>}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md">{p.unitsSold}</span>
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-surface-700">
                                {p.revenueGenerated.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-surface-700">
                                {p.currentStock}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-2.5 py-1 text-[11px] font-bold rounded-full ${statusColor}`}>
                                  {statusText}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {salesStock.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-10 text-surface-400">No data found for this period</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </>
  );
}
