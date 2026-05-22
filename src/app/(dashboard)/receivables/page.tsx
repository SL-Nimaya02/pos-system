"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import {
  CreditCard, TrendingUp, Users, Clock, Search, Download,
  X, ChevronDown, ChevronRight, Printer, AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

const PAGE_SIZE = 25;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) { return `Rs.${n.toFixed(2)}`; }
function fmtDate(d: Date | string) { return new Date(d).toLocaleDateString(); }

type CustomerRow = {
  id: string;
  phone: string;
  name: string | null;
  points: number;
  totalSpend: string;
  createdAt: Date;
  updatedAt: Date;
  creditLimit: string;
  creditBalance: string;
  creditTerms: string | null;
  creditTransactions: {
    id: string;
    customerId: string;
    orderId: string | null;
    type: "charge" | "payment" | "adjustment";
    amount: string;
    balanceAfter: string;
    note: string | null;
    createdAt: Date;
    createdBy: string | null;
  }[];
};

// ─── Slide-over panel ────────────────────────────────────────────────────────
function CustomerSlideOver({
  customer,
  onClose,
}: {
  customer: CustomerRow;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote]     = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjNote, setAdjNote]     = useState("");
  const [newLimit, setNewLimit]   = useState(
    parseFloat(customer.creditLimit ?? "0").toFixed(2)
  );
  const [showPay, setShowPay]     = useState(false);
  const [showAdj, setShowAdj]     = useState(false);
  const [showLimit, setShowLimit] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: detail, isLoading } = trpc.receivables.getCustomerCredit.useQuery({
    customerId: customer.id,
  });

  const recordPayment = trpc.receivables.recordPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded");
      void utils.receivables.listCustomers.invalidate();
      void utils.receivables.summary.invalidate();
      void utils.receivables.getCustomerCredit.invalidate();
      setPayAmount(""); setPayNote(""); setShowPay(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const adjustCredit = trpc.receivables.adjustCredit.useMutation({
    onSuccess: () => {
      toast.success("Adjustment saved");
      void utils.receivables.listCustomers.invalidate();
      void utils.receivables.getCustomerCredit.invalidate();
      setAdjAmount(""); setAdjNote(""); setShowAdj(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateLimit = trpc.receivables.updateCreditLimit.useMutation({
    onSuccess: () => {
      toast.success("Credit limit updated");
      void utils.receivables.listCustomers.invalidate();
      void utils.receivables.getCustomerCredit.invalidate();
      setShowLimit(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const txs = detail?.creditTransactions ?? [];
  const balance = parseFloat(customer.creditBalance ?? "0");
  const limit   = parseFloat(customer.creditLimit   ?? "0");

  // ── Print statement ───────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!detail) return;
    const rows = [...txs].reverse();
    let running = 0;
    const tableRows = rows
      .map((tx) => {
        running += tx.type === "charge"
          ? parseFloat(tx.amount)
          : -Math.abs(parseFloat(tx.amount));
        return `
          <tr>
            <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
            <td style="text-transform:capitalize">${tx.type}</td>
            <td>${tx.note ?? ""}</td>
            <td style="text-align:right">${tx.type === "charge" ? fmt(parseFloat(tx.amount)) : ""}</td>
            <td style="text-align:right">${tx.type !== "charge" ? fmt(Math.abs(parseFloat(tx.amount))) : ""}</td>
            <td style="text-align:right">${fmt(running)}</td>
          </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html><html><head><title>Statement – ${detail.name ?? detail.phone}</title>
    <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{padding:6px 8px;border:1px solid #ddd}th{background:#f5f5f5}</style></head><body>
    <h2>Account Statement</h2>
    <p><strong>${detail.name ?? ""}</strong> &nbsp; ${detail.phone}</p>
    <p>Credit Limit: ${fmt(limit)} &nbsp;&nbsp; Outstanding Balance: ${fmt(balance)}</p>
    <p>Printed: ${new Date().toLocaleString()}</p>
    <table><thead><tr>
      <th>Date</th><th>Type</th><th>Note</th><th>Charge</th><th>Payment</th><th>Balance</th>
    </tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const TYPE_STYLE: Record<string, string> = {
    charge:     "bg-red-100 text-red-700",
    payment:    "bg-emerald-100 text-emerald-700",
    adjustment: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 shrink-0">
          <div>
            <h2 className="font-bold text-surface-900 text-lg">
              {customer.name ?? customer.phone}
            </h2>
            <p className="text-sm text-surface-400">{customer.phone}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Printer size={14} /> Print Statement
            </button>
            <button onClick={onClose} className="text-surface-400 hover:text-surface-700 ml-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Credit summary */}
        <div className="grid grid-cols-3 gap-3 px-6 py-4 bg-surface-50 border-b border-surface-100 shrink-0">
          <div className="text-center">
            <p className="text-xs text-surface-400 uppercase tracking-wide mb-0.5">Credit Limit</p>
            <p className="font-bold text-surface-800">{fmt(limit)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-surface-400 uppercase tracking-wide mb-0.5">Outstanding</p>
            <p className={`font-bold ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(balance)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-surface-400 uppercase tracking-wide mb-0.5">Available</p>
            <p className={`font-bold ${limit - balance > 0 ? "text-emerald-700" : "text-red-600"}`}>
              {fmt(Math.max(0, limit - balance))}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 px-6 py-3 border-b border-surface-100 shrink-0 flex-wrap">
          <button
            onClick={() => { setShowPay((v) => !v); setShowAdj(false); setShowLimit(false); }}
            className="btn-primary text-sm"
          >
            Record Payment
          </button>
          <button
            onClick={() => { setShowAdj((v) => !v); setShowPay(false); setShowLimit(false); }}
            className="btn-secondary text-sm"
          >
            Adjust Balance
          </button>
          <button
            onClick={() => { setShowLimit((v) => !v); setShowPay(false); setShowAdj(false); }}
            className="btn-secondary text-sm"
          >
            Credit Limit
          </button>
        </div>

        {/* Inline forms */}
        {showPay && (
          <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-100 shrink-0">
            <p className="text-xs font-semibold text-emerald-700 mb-2 uppercase tracking-wide">Record Payment</p>
            <div className="flex gap-2">
              <input
                type="number" min={0.01} step={0.01}
                placeholder="Amount"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="input w-32 text-sm"
              />
              <input
                placeholder="Note (optional)"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                className="input flex-1 text-sm"
              />
              <button
                disabled={!payAmount || recordPayment.isPending}
                onClick={() =>
                  recordPayment.mutate({
                    customerId: customer.id,
                    amount: parseFloat(payAmount),
                    note: payNote || undefined,
                  })
                }
                className="btn-primary text-sm disabled:opacity-40"
              >
                {recordPayment.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {showAdj && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 shrink-0">
            <p className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wide">
              Manual Adjustment (positive = charge, negative = credit)
            </p>
            <div className="flex gap-2">
              <input
                type="number" step={0.01}
                placeholder="e.g. -50 or 100"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                className="input w-36 text-sm"
              />
              <input
                placeholder="Note (required)"
                value={adjNote}
                onChange={(e) => setAdjNote(e.target.value)}
                className="input flex-1 text-sm"
              />
              <button
                disabled={!adjAmount || !adjNote || adjustCredit.isPending}
                onClick={() =>
                  adjustCredit.mutate({
                    customerId: customer.id,
                    amount: parseFloat(adjAmount),
                    note: adjNote,
                  })
                }
                className="btn-primary text-sm disabled:opacity-40"
              >
                {adjustCredit.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {showLimit && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 shrink-0">
            <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">Adjust Credit Limit</p>
            <div className="flex gap-2">
              <input
                type="number" min={0} step={100}
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                className="input w-36 text-sm"
              />
              <button
                disabled={updateLimit.isPending}
                onClick={() =>
                  updateLimit.mutate({
                    customerId: customer.id,
                    creditLimit: parseFloat(newLimit),
                  })
                }
                className="btn-primary text-sm disabled:opacity-40"
              >
                {updateLimit.isPending ? "Saving…" : "Update Limit"}
              </button>
            </div>
          </div>
        )}

        {/* Transaction history */}
        <div className="flex-1 overflow-y-auto px-6 py-4" ref={printRef}>
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-3">
            Transaction History ({txs.length})
          </p>
          {isLoading && <p className="text-sm text-surface-400">Loading…</p>}
          {!isLoading && txs.length === 0 && (
            <p className="text-sm text-surface-400 italic">No transactions yet</p>
          )}
          <div className="space-y-2">
            {txs.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-xl border border-surface-100 bg-white"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${TYPE_STYLE[tx.type] ?? ""}`}>
                    {tx.type}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-surface-700">{tx.note ?? "—"}</p>
                    <p className="text-xs text-surface-400">{fmtDate(tx.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${tx.type === "charge" ? "text-red-600" : "text-emerald-600"}`}>
                    {tx.type === "charge" ? "+" : "−"}{fmt(parseFloat(tx.amount))}
                  </p>
                  <p className="text-xs text-surface-400">Balance: {fmt(parseFloat(tx.balanceAfter))}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ReceivablesPage() {
  const [search, setSearch]               = useState("");
  const [selectedCustomer, setSelected]   = useState<CustomerRow | null>(null);
  const [agingExpanded, setAgingExpanded] = useState(false);

  const { data: summary, isLoading: summaryLoading } = trpc.receivables.summary.useQuery();
  const { data: aging }    = trpc.receivables.agingReport.useQuery();
  const { data: customers, isLoading: custLoading } = trpc.receivables.listCustomers.useQuery(
    { search: search || undefined }
  );

  // ── KPI cards ──────────────────────────────────────────────────────────────
  const kpis = [
    {
      label: "Total Outstanding",
      value: `Rs.${(summary?.totalOutstanding ?? 0).toFixed(2)}`,
      icon: CreditCard,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Overdue (30+ days)",
      value: `Rs.${(summary?.overdueBalance ?? 0).toFixed(2)}`,
      icon: AlertCircle,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Customers with Balance",
      value: String(summary?.customersWithBalance ?? 0),
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Avg Days Outstanding",
      value: `${summary?.avgDaysOutstanding ?? 0} days`,
      icon: Clock,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const header = ["Name", "Phone", "Credit Limit", "Balance", "Available", "Terms", "Last Transaction"];
    const rows = (customers ?? []).map((c) => [
      c.name ?? "",
      c.phone,
      parseFloat(c.creditLimit  ?? "0").toFixed(2),
      parseFloat(c.creditBalance ?? "0").toFixed(2),
      (parseFloat(c.creditLimit ?? "0") - parseFloat(c.creditBalance ?? "0")).toFixed(2),
      c.creditTerms ?? "",
      c.creditTransactions[0] ? fmtDate(c.creditTransactions[0].createdAt) : "",
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...rows]), "Receivables");
    XLSX.writeFile(wb, `receivables-${new Date().toISOString().slice(0, 10)}.csv`, { bookType: "csv" });
  };

  // ── Overdue badge ──────────────────────────────────────────────────────────
  const isOverdue = (c: CustomerRow) => {
    const last = c.creditTransactions[0];
    if (!last) return parseFloat(c.creditBalance ?? "0") > 0;
    const days = Math.floor(
      (Date.now() - new Date(last.createdAt).getTime()) / 86_400_000
    );
    return parseFloat(c.creditBalance ?? "0") > 0 && days > 30;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <CreditCard size={24} className="text-brand-600" /> Accounts Receivable
          </h1>
          <p className="text-sm text-surface-400 mt-1">Credit sales & outstanding balances</p>
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5 text-sm">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="card p-4">
            <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center mb-3`}>
              <k.icon size={18} className={k.color} />
            </div>
            <p className="text-xs text-surface-400 mb-0.5">{k.label}</p>
            <p className={`text-xl font-bold ${summaryLoading ? "animate-pulse text-surface-200" : k.color}`}>
              {summaryLoading ? "——" : k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Aging report */}
      <div className="card">
        <button
          onClick={() => setAgingExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 border-b border-surface-100 hover:bg-surface-50 transition-colors"
        >
          <span className="font-semibold text-surface-800 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-600" /> Aging Report
          </span>
          {agingExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {agingExpanded && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 text-left">
                  {["Customer", "Phone", "0-30 days", "31-60 days", "61-90 days", "90+ days", "Total"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold text-surface-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(aging ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-surface-400">No outstanding balances</td>
                  </tr>
                )}
                {(aging ?? []).map((row) => (
                  <tr
                    key={row.customerId}
                    className="border-b border-surface-50 hover:bg-surface-50 cursor-pointer transition-colors"
                    onClick={() => {
                      const c = (customers ?? []).find((x) => x.id === row.customerId);
                      if (c) setSelected(c);
                    }}
                  >
                    <td className="px-4 py-3 font-medium text-surface-800">{row.name}</td>
                    <td className="px-4 py-3 text-surface-500">{row.phone}</td>
                    <td className="px-4 py-3 text-emerald-700">{row.bucket0_30 > 0 ? fmt(row.bucket0_30) : "—"}</td>
                    <td className="px-4 py-3 text-amber-700">{row.bucket31_60 > 0 ? fmt(row.bucket31_60) : "—"}</td>
                    <td className="px-4 py-3 text-orange-700">{row.bucket61_90 > 0 ? fmt(row.bucket61_90) : "—"}</td>
                    <td className="px-4 py-3 text-red-700 font-semibold">{row.bucket90plus > 0 ? fmt(row.bucket90plus) : "—"}</td>
                    <td className="px-4 py-3 font-bold text-surface-900">{fmt(row.creditBalance)}</td>
                  </tr>
                ))}
                {(aging ?? []).length > 0 && (
                  <tr className="bg-surface-50 font-semibold">
                    <td colSpan={2} className="px-4 py-3 text-surface-500">Totals</td>
                    {(["bucket0_30", "bucket31_60", "bucket61_90", "bucket90plus"] as const).map((k) => (
                      <td key={k} className="px-4 py-3">
                        {fmt((aging ?? []).reduce((s, r) => s + r[k], 0))}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-surface-900">
                      {fmt((aging ?? []).reduce((s, r) => s + r.creditBalance, 0))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer list */}
      <div className="card">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-100">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="input pl-9 text-sm"
            />
          </div>
          <span className="text-sm text-surface-400">{customers?.length ?? 0} customers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 text-left">
                {["Name", "Phone", "Credit Limit", "Balance", "Available", "Last Transaction", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-surface-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {custLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-surface-400">Loading…</td>
                </tr>
              )}
              {!custLoading && (customers ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-surface-400">
                    No credit customers found
                  </td>
                </tr>
              )}
              {(customers ?? []).map((c) => {
                const bal       = parseFloat(c.creditBalance ?? "0");
                const lim       = parseFloat(c.creditLimit   ?? "0");
                const avail     = Math.max(0, lim - bal);
                const overdue   = isOverdue(c);
                const lastTx    = c.creditTransactions[0];
                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="border-b border-surface-50 hover:bg-surface-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-surface-800">{c.name ?? "—"}</td>
                    <td className="px-4 py-3 text-surface-500">{c.phone}</td>
                    <td className="px-4 py-3">{fmt(lim)}</td>
                    <td className={`px-4 py-3 font-semibold ${bal > 0 ? "text-red-600" : "text-surface-500"}`}>
                      {fmt(bal)}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${avail > 0 ? "text-emerald-600" : "text-surface-400"}`}>
                      {fmt(avail)}
                    </td>
                    <td className="px-4 py-3 text-surface-400">
                      {lastTx ? fmtDate(lastTx.createdAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {bal === 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          Clear
                        </span>
                      ) : overdue ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          Overdue
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          Current
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over */}
      {selectedCustomer && (
        <CustomerSlideOver
          customer={selectedCustomer}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
