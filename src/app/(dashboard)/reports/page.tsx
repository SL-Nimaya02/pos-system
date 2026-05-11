"use client";

import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  DollarSign, ShoppingCart, TrendingUp, CalendarDays,
  Banknote, CreditCard, Printer, FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportsPage() {
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

      <div className="p-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Reports</h1>
            <p className="text-sm text-surface-400 mt-1">Sales performance by date range</p>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={exportExcel}
              disabled={!orders?.length}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              <FileSpreadsheet size={15} /> Export Excel
            </button>
            <button
              onClick={handlePrint}
              disabled={!orders?.length}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-surface-800 hover:bg-surface-900 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              <Printer size={15} /> Print / PDF
            </button>
          </div>
        </div>

        {/* Date Filter */}
        <div className="card p-4 mb-6 flex flex-wrap items-center gap-3 no-print">
          <CalendarDays size={18} className="text-brand-600 shrink-0" />
          <div className="flex items-center gap-2">
            <input type="date" className="input py-1.5 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span className="text-surface-400 text-sm">to</span>
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
              { label: "Revenue",     value: `LKR ${filteredRevenue.toFixed(2)}`, icon: DollarSign,  color: "text-brand-600",  bg: "bg-brand-50"  },
              { label: "Orders",      value: String(filteredCount),               icon: ShoppingCart, color: "text-blue-600",   bg: "bg-blue-50"   },
              { label: "Avg Order",   value: `LKR ${filteredAvg.toFixed(2)}`,     icon: TrendingUp,   color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Cash / Card", value: `${cashCount} / ${cardCount}`,       icon: Banknote,     color: "text-amber-600",  bg: "bg-amber-50"  },
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
                <p className="text-xs text-surface-400 font-medium">Cash Revenue</p>
                <p className="text-base font-bold text-surface-800">LKR {cashRevenue.toFixed(2)}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <CreditCard size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-surface-400 font-medium">Card Revenue</p>
                <p className="text-base font-bold text-surface-800">LKR {cardRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Orders table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
              <h2 className="font-semibold text-surface-800">
                Completed Orders {!isToday && `· ${startDate} → ${endDate}`}
              </h2>
              <span className="text-xs text-surface-400">{filteredCount} orders</span>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-surface-400 text-sm">Loading...</div>
            ) : orders?.length === 0 ? (
              <div className="p-10 text-center text-surface-300">
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No completed orders in this period</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Order #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Date &amp; Time</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Items</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Payment</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Subtotal</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Tax</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Total</th>
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
