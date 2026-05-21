"use client";

import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  DollarSign, ShoppingCart, TrendingUp, CalendarDays,
  Banknote, CreditCard, Printer, FileSpreadsheet, TrendingDown, BarChart2,
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
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate]     = useState(todayStr());
  const printRef = useRef<HTMLDivElement>(null);

  const { data: summary } = trpc.orders.summary.useQuery();
  const { data: orders, isLoading } = trpc.orders.list.useQuery({
    limit: 500,
    status: "completed",
    startDate,
    endDate,
  });

  const { data: pnl, isLoading: pnlLoading } = trpc.orders.pnl.useQuery({
    startDate,
    endDate,
  });

  const { data: cashFlow } = trpc.finance.cashFlow.useQuery({ startDate, endDate });

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
    if (!orders?.length) return;

    // Summary sheet
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

    // Orders sheet
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

    // Order line items sheet
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

    // P&L sheet
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
      ...(itemsMissingCost > 0 ? [[], [`* COGS is partial — ${itemsMissingCost} line item(s) have no cost price set`]] : []),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pnlSheetData), "P&L");

    const filename = `sales-report_${startDate}_to_${endDate}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  // ── Print ─────────────────────────────────────────────────────────────────
  function handlePrint() {
    window.print();
  }

  const isToday = startDate === todayStr() && endDate === todayStr();

  return (
    <>
      {/* Print-only styles injected inline */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-report, #print-report * { visibility: visible; }
          #print-report { position: fixed; inset: 0; padding: 24px; font-family: sans-serif; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">{t.reports.title}</h1>
            <p className="text-sm text-surface-400 mt-1">{t.reports.salesPerformance}</p>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={exportExcel}
              disabled={!orders?.length}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              <FileSpreadsheet size={15} /> {t.reports.exportExcel}
            </button>
            <button
              onClick={handlePrint}
              disabled={!orders?.length}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-surface-800 hover:bg-surface-900 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              <Printer size={15} /> {t.reports.printPDF}
            </button>
          </div>
        </div>

        {/* Date Filter */}
        <div className="card p-4 mb-6 flex flex-wrap items-center gap-3 no-print">
          <CalendarDays size={18} className="text-brand-600 shrink-0" />
          <div className="flex items-center gap-2">
            <input type="date" className="input py-1.5 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span className="text-surface-400 text-sm">{t.reports.to}</span>
            <input type="date" className="input py-1.5 text-sm" value={endDate}   onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="flex gap-2 ml-auto">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => { setStartDate(p.start); setEndDate(p.end); }}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
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

        {/* Printable area */}
        <div id="print-report" ref={printRef}>
          {/* Print header (only shows on print) */}
          <div className="hidden print:block mb-6">
            <h1 className="text-2xl font-bold">Sales Report</h1>
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

          {/* Revenue breakdown */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="card p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
                <Banknote size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-surface-400 font-medium">{t.reports.cashRevenue}</p>
                <p className="text-base font-bold text-surface-800">LKR {cashRevenue.toFixed(2)}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <CreditCard size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-surface-400 font-medium">{t.reports.cardRevenue}</p>
                <p className="text-base font-bold text-surface-800">LKR {cardRevenue.toFixed(2)}</p>
              </div>
            </div>
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
                {/* Gross Revenue */}
                <div className="flex items-center justify-between py-3 border-b border-surface-100">
                  <span className="text-sm text-surface-600 flex items-center gap-2">
                    <DollarSign size={14} className="text-brand-500" />
                    {t.reports.grossRevenue}
                  </span>
                  <span className="text-sm font-semibold text-surface-800">LKR {grossRevenue.toFixed(2)}</span>
                </div>

                {/* Tax Collected */}
                <div className="flex items-center justify-between py-3 border-b border-surface-100 pl-4">
                  <span className="text-sm text-surface-500">{t.reports.taxCollected}</span>
                  <span className="text-sm text-red-500">− LKR {taxCollected.toFixed(2)}</span>
                </div>

                {/* Discounts */}
                <div className="flex items-center justify-between py-3 border-b border-surface-100 pl-4">
                  <span className="text-sm text-surface-500">{t.reports.discountsGiven}</span>
                  <span className="text-sm text-red-500">− LKR {discountsGiven.toFixed(2)}</span>
                </div>

                {/* Net Sales */}
                <div className="flex items-center justify-between py-3 border-b border-surface-200 bg-surface-50 -mx-5 px-5">
                  <span className="text-sm font-semibold text-surface-700">{t.reports.netSales}</span>
                  <span className="text-sm font-bold text-surface-800">LKR {netSales.toFixed(2)}</span>
                </div>

                {/* COGS */}
                <div className="flex items-center justify-between py-3 border-b border-surface-100 pl-4">
                  <span className="text-sm text-surface-500 flex items-center gap-2">
                    <TrendingDown size={14} className="text-orange-400" />
                    {t.reports.cogs}
                  </span>
                  <span className="text-sm text-red-500">− LKR {cogs.toFixed(2)}</span>
                </div>

                {/* Gross Profit */}
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

                {/* Other Income */}
                <div className="flex items-center justify-between py-3 border-b border-surface-100 pl-4">
                  <span className="text-sm text-surface-500 flex items-center gap-2">
                    <TrendingUp size={14} className="text-green-400" />
                    {t.reports.otherIncome}
                  </span>
                  <span className="text-sm text-green-600">+ LKR {totalOtherIncome.toFixed(2)}</span>
                </div>

                {/* Operating Expenses */}
                <div className="flex items-center justify-between py-3 border-b border-surface-100 pl-4">
                  <span className="text-sm text-surface-500 flex items-center gap-2">
                    <TrendingDown size={14} className="text-red-400" />
                    {t.reports.operatingExpenses}
                  </span>
                  <span className="text-sm text-red-500">− LKR {totalExpenses.toFixed(2)}</span>
                </div>

                {/* Net Profit */}
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

                {/* Partial COGS warning */}
                {itemsMissingCost > 0 && (
                  <p className="text-xs text-amber-600 pt-3">{t.reports.partialCogs}</p>
                )}
              </div>
            )}
          </div>

          {/* Cash Flow Summary */}
          {cashFlow && (
            <div className="card overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
                <Banknote size={18} className="text-blue-600" />
                <h2 className="font-semibold text-surface-800">Statement of Cash Flows</h2>
                {!isToday && <span className="text-xs text-surface-400 ml-1">· {startDate} → {endDate}</span>}
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inflows */}
                <div>
                  <p className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">Cash Inflows</p>
                  <div className="space-y-0">
                    {[
                      { label: "Cash Sales",   value: cashFlow.totals.salesCash,  color: "text-green-600" },
                      { label: "Card Sales",   value: cashFlow.totals.salesCard,  color: "text-blue-600"  },
                      { label: "Other Income", value: cashFlow.totals.income + cashFlow.totals.cashIn, color: "text-green-500" },
                    ].map((r) => (
                      <div key={r.label} className="flex justify-between py-2 border-b border-surface-100">
                        <span className="text-sm text-surface-600">{r.label}</span>
                        <span className={`text-sm font-medium ${r.color}`}>LKR {r.value.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 bg-green-50 -mx-5 px-5 mt-1">
                      <span className="text-sm font-bold text-green-700">Total Inflows</span>
                      <span className="text-sm font-bold text-green-700">LKR {cashFlow.totals.totalIn.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                {/* Outflows */}
                <div>
                  <p className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">Cash Outflows</p>
                  <div className="space-y-0">
                    {[
                      { label: "Operating Expenses", value: cashFlow.totals.expenses,         color: "text-red-500"    },
                      { label: "Supplier Payments",  value: cashFlow.totals.supplierPayments, color: "text-purple-600" },
                      { label: "Register Cash-Out",  value: cashFlow.totals.cashOut,           color: "text-orange-600" },
                    ].map((r) => (
                      <div key={r.label} className="flex justify-between py-2 border-b border-surface-100">
                        <span className="text-sm text-surface-600">{r.label}</span>
                        <span className={`text-sm font-medium ${r.color}`}>LKR {r.value.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-3 bg-red-50 -mx-5 px-5 mt-1">
                      <span className="text-sm font-bold text-red-700">Total Outflows</span>
                      <span className="text-sm font-bold text-red-700">LKR {cashFlow.totals.totalOut.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Net Cash Position */}
              <div className={`px-5 py-4 border-t-2 border-surface-200 flex justify-between items-center ${cashFlow.totals.net >= 0 ? "bg-indigo-50" : "bg-red-50"}`}>
                <span className={`text-base font-bold ${cashFlow.totals.net >= 0 ? "text-indigo-700" : "text-red-700"}`}>
                  Net Cash Position
                </span>
                <span className={`text-base font-bold ${cashFlow.totals.net >= 0 ? "text-indigo-700" : "text-red-700"}`}>
                  {cashFlow.totals.net >= 0 ? "+" : ""}LKR {cashFlow.totals.net.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Orders table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
              <h2 className="font-semibold text-surface-800">
                {t.dashboard.completedOrders} {!isToday && `· ${startDate} → ${endDate}`}
              </h2>
              <span className="text-xs text-surface-400">{filteredCount} orders</span>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-surface-400 text-sm">{t.common.loading}</div>
            ) : orders?.length === 0 ? (
              <div className="p-10 text-center text-surface-300">
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No completed orders in this period</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.orders.orderHeader}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.orders.dateHeader}</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">{t.orders.itemsHeader}</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">{t.orders.paymentHeader}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">{t.common.subtotal}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">{t.common.tax}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">{t.orders.totalHeader}</th>
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
                          {order.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-surface-600 text-xs">
                        LKR {parseFloat(order.subtotal).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-surface-500 text-xs">
                        LKR {parseFloat(order.taxAmount ?? "0").toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-surface-800">
                        LKR {parseFloat(order.total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-50 border-t-2 border-surface-200">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-xs font-bold text-surface-600 uppercase tracking-wider">Total</td>
                    <td className="px-4 py-3 text-right text-sm text-surface-600 font-semibold">
                      LKR {orders?.reduce((s, o) => s + parseFloat(o.subtotal), 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-surface-600 font-semibold">
                      LKR {filteredTax.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-brand-700">
                      LKR {filteredRevenue.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
