"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/language-context";
import {
  CalendarDays, Plus, Trash2, TrendingDown, TrendingUp, Wallet,
  ArrowDownToLine, ArrowUpFromLine, Activity, LayoutList, Pencil, X, Check,
  Building2, Banknote, Scale,
} from "lucide-react";
import toast from "react-hot-toast";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const EXPENSE_CATEGORIES = [
  "Rent", "Salaries", "Utilities", "Supplies",
  "Marketing", "Maintenance", "Insurance", "Transport", "Other",
] as const;

const INCOME_CATEGORIES = [
  "Investment", "Grant", "Rental Income", "Interest", "Other",
] as const;

type Tab = "expenses" | "income" | "cashflow" | "balance-sheet";

const ASSET_CATS     = ["Cash & Bank","Accounts Receivable","Inventory","Prepaid Expenses","Equipment","Furniture & Fixtures","Vehicles","Land & Buildings","Other Assets"];
const LIABILITY_CATS = ["Accounts Payable","Short-term Loans","Tax Payable","Accrued Expenses","Long-term Loans","Mortgage","Other Liabilities"];
const CAPITAL_CATS   = ["Owner's Equity","Share Capital","Retained Earnings","Other Capital"];

export default function FinancePage() {
  const { t } = useLanguage();
  const utils = trpc.useUtils();

  const [tab, setTab]             = useState<Tab>("expenses");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate]     = useState(todayStr());
  const [showForm, setShowForm]   = useState(false);

  // Balance Sheet form state
  const [bsShowForm, setBsShowForm]   = useState(false);
  const [bsType, setBsType]           = useState<"asset"|"liability"|"capital">("asset");
  const [bsCategory, setBsCategory]   = useState("");
  const [bsName, setBsName]           = useState("");
  const [bsBalance, setBsBalance]     = useState("");
  const [bsNotes, setBsNotes]         = useState("");
  const [bsEditId, setBsEditId]       = useState<string|null>(null);

  // Form state
  const [fCategory, setFCategory] = useState<string>("");
  const [fDesc,     setFDesc]     = useState("");
  const [fAmount,   setFAmount]   = useState("");
  const [fDate,     setFDate]     = useState(todayStr());

  const presets = [
    { label: t.common.today,       start: todayStr(), end: todayStr() },
    { label: t.common.last7Days,   start: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), end: todayStr() },
    { label: t.common.last30Days,  start: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), end: todayStr() },
  ];

  // Queries
  const { data: expenses = [], isLoading: expLoading } = trpc.finance.listExpenses.useQuery({ startDate, endDate });
  const { data: income   = [], isLoading: incLoading } = trpc.finance.listIncome.useQuery({ startDate, endDate });
  const { data: cashFlow, isLoading: cfLoading }        = trpc.finance.cashFlow.useQuery({ startDate, endDate }, { enabled: tab === "cashflow" });
  const { data: bsAccounts = [], isLoading: bsLoading } = trpc.balanceSheet.list.useQuery(undefined, { enabled: tab === "balance-sheet" });

  // Mutations
  const addExpense = trpc.finance.addExpense.useMutation({
    onSuccess: () => {
      utils.finance.listExpenses.invalidate();
      utils.orders.pnl.invalidate();
      resetForm();
      toast.success("Expense saved");
    },
  });

  const addIncome = trpc.finance.addIncome.useMutation({
    onSuccess: () => {
      utils.finance.listIncome.invalidate();
      utils.orders.pnl.invalidate();
      resetForm();
      toast.success("Income saved");
    },
  });

  const deleteEntry = trpc.finance.delete.useMutation({
    onSuccess: () => {
      utils.finance.listExpenses.invalidate();
      utils.finance.listIncome.invalidate();
      utils.orders.pnl.invalidate();
      toast.success("Deleted");
    },
  });

  const bsCreate = trpc.balanceSheet.create.useMutation({
    onSuccess: () => { utils.balanceSheet.list.invalidate(); resetBsForm(); toast.success("Account added"); },
  });
  const bsUpdate = trpc.balanceSheet.update.useMutation({
    onSuccess: () => { utils.balanceSheet.list.invalidate(); resetBsForm(); toast.success("Account updated"); },
  });
  const bsDelete = trpc.balanceSheet.delete.useMutation({
    onSuccess: () => { utils.balanceSheet.list.invalidate(); toast.success("Account deleted"); },
  });

  function resetForm() {
    setFCategory("");
    setFDesc("");
    setFAmount("");
    setFDate(todayStr());
    setShowForm(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fCategory || !fAmount || parseFloat(fAmount) <= 0) return;

    if (tab === "expenses") {
      addExpense.mutate({
        category:    fCategory as typeof EXPENSE_CATEGORIES[number],
        description: fDesc || undefined,
        amount:      parseFloat(fAmount).toFixed(2),
        date:        fDate,
      });
    } else {
      addIncome.mutate({
        category:    fCategory as typeof INCOME_CATEGORIES[number],
        description: fDesc || undefined,
        amount:      parseFloat(fAmount).toFixed(2),
        date:        fDate,
      });
    }
  }

  function handleDelete(id: string) {
    if (!confirm(t.finance.deleteConfirm)) return;
    deleteEntry.mutate({ id });
  }

  function resetBsForm() {
    setBsShowForm(false); setBsEditId(null);
    setBsName(""); setBsCategory(""); setBsBalance(""); setBsNotes("");
    setBsType("asset");
  }

  function openBsEdit(acc: typeof bsAccounts[0]) {
    setBsEditId(acc.id);
    setBsType(acc.type as "asset"|"liability"|"capital");
    setBsCategory(acc.category);
    setBsName(acc.name);
    setBsBalance(parseFloat(acc.balance).toFixed(2));
    setBsNotes(acc.notes ?? "");
    setBsShowForm(true);
  }

  function handleBsSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cats = bsType === "asset" ? ASSET_CATS : bsType === "liability" ? LIABILITY_CATS : CAPITAL_CATS;
    if (!bsName || !bsCategory || !cats.includes(bsCategory as typeof ASSET_CATS[number])) return;
    const balance = parseFloat(bsBalance) || 0;
    if (bsEditId) {
      bsUpdate.mutate({ id: bsEditId, name: bsName, category: bsCategory, balance, notes: bsNotes || undefined });
    } else {
      bsCreate.mutate({ name: bsName, type: bsType, category: bsCategory, balance, notes: bsNotes || undefined });
    }
  }

  const categories = tab === "expenses" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const entries    = tab === "expenses" ? expenses : income;
  const isLoading  = tab === "expenses" ? expLoading : incLoading;
  const total      = entries.reduce((s, e) => s + parseFloat(e.amount), 0);

  const isMutating = addExpense.isPending || addIncome.isPending;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{t.finance.title}</h1>
          <p className="text-sm text-surface-400 mt-1">{t.finance.subtitle}</p>
        </div>
        {tab !== "cashflow" && tab !== "balance-sheet" && (
        <button
          onClick={() => { setShowForm(!showForm); setFCategory(""); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors"
        >
          <Plus size={15} />
          {tab === "expenses" ? t.finance.addExpense : t.finance.addIncome}
        </button>
        )}
        {tab === "balance-sheet" && (
        <button
          onClick={() => { setBsShowForm(!bsShowForm); setBsEditId(null); resetBsForm(); setBsShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors"
        >
          <Plus size={15} /> Add Account
        </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-100 rounded-xl mb-5 w-fit">
        <button onClick={() => { setTab("expenses"); setShowForm(false); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "expenses" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"}`}>
          <TrendingDown size={15} className={tab === "expenses" ? "text-red-500" : "text-surface-400"} />
          {t.finance.expensesTab}
        </button>
        <button onClick={() => { setTab("income"); setShowForm(false); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "income" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"}`}>
          <TrendingUp size={15} className={tab === "income" ? "text-green-500" : "text-surface-400"} />
          {t.finance.incomeTab}
        </button>
        <button onClick={() => { setTab("cashflow"); setShowForm(false); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "cashflow" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"}`}>
          <Activity size={15} className={tab === "cashflow" ? "text-brand-500" : "text-surface-400"} />
          Cash Flow
        </button>
        <button onClick={() => { setTab("balance-sheet"); setShowForm(false); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "balance-sheet" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"}`}>
          <Scale size={15} className={tab === "balance-sheet" ? "text-purple-500" : "text-surface-400"} />
          Balance Sheet
        </button>
      </div>

      {/* Cash Flow view */}
      {tab === "cashflow" && (
        <>
          {/* Summary tiles */}
          {cashFlow && (
            <div className="grid grid-cols-4 gap-4 mb-5">
              <div className="card p-4">
                <p className="text-xs text-surface-500 font-medium mb-1">Total Inflow</p>
                <p className="text-xl font-bold text-green-600">LKR {cashFlow.totals.totalIn.toFixed(2)}</p>
                <p className="text-xs text-surface-400 mt-0.5">Sales + Income + Cash-In</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-surface-500 font-medium mb-1">Total Outflow</p>
                <p className="text-xl font-bold text-red-600">LKR {cashFlow.totals.totalOut.toFixed(2)}</p>
                <p className="text-xs text-surface-400 mt-0.5">Expenses + Supplier Pmts + Cash-Out</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-surface-500 font-medium mb-1">Net Cash Flow</p>
                <p className={`text-xl font-bold ${cashFlow.totals.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                  LKR {cashFlow.totals.net.toFixed(2)}
                </p>
                <p className="text-xs text-surface-400 mt-0.5">Inflow − Outflow</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-surface-500 font-medium mb-1">Cash Sales</p>
                <p className="text-xl font-bold text-brand-600">LKR {cashFlow.totals.salesCash.toFixed(2)}</p>
                <p className="text-xs text-surface-400 mt-0.5">
                  Card: LKR {cashFlow.totals.salesCard.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Breakdown tiles */}
          {cashFlow && (
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="card p-3 border-l-4 border-green-400">
                <p className="text-xs text-surface-500 font-medium">Other Income</p>
                <p className="text-lg font-bold text-green-700">LKR {cashFlow.totals.income.toFixed(2)}</p>
              </div>
              <div className="card p-3 border-l-4 border-blue-400">
                <p className="text-xs text-surface-500 font-medium">Register Cash-In</p>
                <p className="text-lg font-bold text-blue-700">LKR {cashFlow.totals.cashIn.toFixed(2)}</p>
              </div>
              <div className="card p-3 border-l-4 border-red-400">
                <p className="text-xs text-surface-500 font-medium">Expenses</p>
                <p className="text-lg font-bold text-red-700">LKR {cashFlow.totals.expenses.toFixed(2)}</p>
              </div>
              <div className="card p-3 border-l-4 border-orange-400">
                <p className="text-xs text-surface-500 font-medium">Register Cash-Out</p>
                <p className="text-lg font-bold text-orange-700">LKR {cashFlow.totals.cashOut.toFixed(2)}</p>
              </div>
              <div className="card p-3 border-l-4 border-purple-400">
                <p className="text-xs text-surface-500 font-medium">Supplier Payments</p>
                <p className="text-lg font-bold text-purple-700">LKR {cashFlow.totals.supplierPayments.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Daily breakdown table */}
          <div className="card overflow-hidden">
            {cfLoading ? (
              <div className="p-8 text-center text-surface-400 text-sm">Loading…</div>
            ) : !cashFlow || cashFlow.daily.length === 0 ? (
              <div className="p-10 text-center text-surface-300">
                <Activity size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No cash flow data for this period</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-surface-500 font-semibold">Date</th>
                    <th className="text-right px-3 py-3 text-green-600 font-semibold">Cash Sales</th>
                    <th className="text-right px-3 py-3 text-blue-600 font-semibold">Card Sales</th>
                    <th className="text-right px-3 py-3 text-green-500 font-semibold">Other In</th>
                    <th className="text-right px-3 py-3 text-green-700 font-semibold">Total In</th>
                    <th className="text-right px-3 py-3 text-red-500 font-semibold">Expenses</th>
                    <th className="text-right px-3 py-3 text-purple-600 font-semibold">Supplier Pmts</th>
                    <th className="text-right px-3 py-3 text-red-700 font-semibold">Total Out</th>
                    <th className="text-right px-4 py-3 font-semibold">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {cashFlow.daily.map((row) => (
                    <tr key={row.date} className="hover:bg-surface-50">
                      <td className="px-4 py-2.5 font-medium text-surface-700">{row.date}</td>
                      <td className="px-3 py-2.5 text-right text-green-600">LKR {row.salesCash.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right text-blue-600">LKR {row.salesCard.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right text-green-500">
                        LKR {(row.income + row.cashIn).toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-green-700">LKR {row.totalIn.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right text-red-500">LKR {row.expenses.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right text-purple-600">LKR {row.supplierPayments.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-red-700">LKR {row.totalOut.toFixed(2)}</td>
                      <td className={`px-4 py-2.5 text-right font-bold ${
                        row.net >= 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {row.net >= 0 ? "+" : ""}LKR {row.net.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-50 border-t-2 border-surface-200">
                  <tr>
                    <td className="px-4 py-3 text-xs font-bold text-surface-600 uppercase tracking-wider">Total</td>
                    <td className="px-3 py-3 text-right font-bold text-green-600">LKR {cashFlow.totals.salesCash.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right font-bold text-blue-600">LKR {cashFlow.totals.salesCard.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right font-bold text-green-500">LKR {(cashFlow.totals.income + cashFlow.totals.cashIn).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right font-bold text-green-700">LKR {cashFlow.totals.totalIn.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right font-bold text-red-500">LKR {cashFlow.totals.expenses.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right font-bold text-purple-600">LKR {cashFlow.totals.supplierPayments.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right font-bold text-red-700">LKR {cashFlow.totals.totalOut.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${
                      cashFlow.totals.net >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {cashFlow.totals.net >= 0 ? "+" : ""}LKR {cashFlow.totals.net.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}

      {/* Add form */}
      {tab !== "cashflow" && showForm && (
        <div className="card p-5 mb-5">
          <h3 className="font-semibold text-surface-800 mb-4">
            {tab === "expenses" ? t.finance.newExpense : t.finance.newIncome}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">{t.finance.category} *</label>
              <select
                className="input text-sm"
                value={fCategory}
                onChange={(e) => setFCategory(e.target.value)}
                required
              >
                <option value="">— select —</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">{t.finance.description}</label>
              <input
                type="text"
                className="input text-sm"
                placeholder={t.finance.source}
                value={fDesc}
                onChange={(e) => setFDesc(e.target.value)}
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">{t.finance.amount} *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="input text-sm"
                placeholder="0.00"
                value={fAmount}
                onChange={(e) => setFAmount(e.target.value)}
                required
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">{t.finance.date} *</label>
              <input
                type="date"
                className="input text-sm"
                value={fDate}
                onChange={(e) => setFDate(e.target.value)}
                required
              />
            </div>

            {/* Buttons */}
            <div className="sm:col-span-2 lg:col-span-4 flex gap-2 justify-end">
              <button type="button" onClick={resetForm} className="btn-secondary text-sm px-4 py-2">
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isMutating}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-xl transition-colors"
              >
                {isMutating ? t.common.saving : (tab === "expenses" ? t.finance.saveExpense : t.finance.saveIncome)}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Date filter */}
      <div className="card p-4 mb-5 flex flex-wrap items-center gap-3">
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

      {/* Summary card — expenses / income only */}
      {tab !== "cashflow" && (
      <>
      <div className={`card p-4 mb-5 flex items-center gap-3 ${tab === "expenses" ? "border-red-100 bg-red-50" : "border-green-100 bg-green-50"}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tab === "expenses" ? "bg-red-100" : "bg-green-100"}`}>
          <Wallet size={18} className={tab === "expenses" ? "text-red-600" : "text-green-600"} />
        </div>
        <div>
          <p className="text-xs font-medium text-surface-500">
            {tab === "expenses" ? t.finance.totalExpenses : t.finance.totalOtherIncome}
          </p>
          <p className={`text-xl font-bold ${tab === "expenses" ? "text-red-700" : "text-green-700"}`}>
            LKR {total.toFixed(2)}
          </p>
        </div>
        <span className="ml-auto text-sm text-surface-400">{entries.length} {t.common.items}</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-surface-400 text-sm">{t.common.loading}</div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-surface-300">
            {tab === "expenses"
              ? <TrendingDown size={32} className="mx-auto mb-2 opacity-30" />
              : <TrendingUp   size={32} className="mx-auto mb-2 opacity-30" />}
            <p className="text-sm">{tab === "expenses" ? t.finance.noExpenses : t.finance.noIncome}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.finance.date}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.finance.category}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.finance.description}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">{t.finance.amount}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3 text-surface-500 text-xs whitespace-nowrap">
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                      tab === "expenses" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                    }`}>
                      {entry.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-surface-600 text-xs">{entry.description ?? "—"}</td>
                  <td className={`px-4 py-3 text-right font-bold ${tab === "expenses" ? "text-red-600" : "text-green-600"}`}>
                    LKR {parseFloat(entry.amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deleteEntry.isPending}
                      className="text-surface-300 hover:text-red-500 transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-surface-50 border-t-2 border-surface-200">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-xs font-bold text-surface-600 uppercase tracking-wider">
                  {t.common.total}
                </td>
                <td className={`px-4 py-3 text-right font-bold ${tab === "expenses" ? "text-red-600" : "text-green-600"}`}>
                  LKR {total.toFixed(2)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
      </>
      )} {/* end tab !== cashflow */}

      {/* ── Balance Sheet ── */}
      {tab === "balance-sheet" && (() => {
        const assets      = bsAccounts.filter(a => a.type === "asset");
        const liabilities = bsAccounts.filter(a => a.type === "liability");
        const capital     = bsAccounts.filter(a => a.type === "capital");
        const totalAssets      = assets.reduce((s, a) => s + parseFloat(a.balance), 0);
        const totalLiabilities = liabilities.reduce((s, a) => s + parseFloat(a.balance), 0);
        const totalCapital     = capital.reduce((s, a) => s + parseFloat(a.balance), 0);
        const balanced         = Math.abs(totalAssets - (totalLiabilities + totalCapital)) < 0.01;
        const bsCats = bsType === "asset" ? ASSET_CATS : bsType === "liability" ? LIABILITY_CATS : CAPITAL_CATS;

        const Section = ({ title, accounts, color, icon: Icon, emptyMsg }: {
          title: string; accounts: typeof bsAccounts; color: string;
          icon: React.ElementType; emptyMsg: string;
        }) => {
          const total = accounts.reduce((s, a) => s + parseFloat(a.balance), 0);
          const groups: Record<string, typeof bsAccounts> = {};
          accounts.forEach(a => { (groups[a.category] ??= []).push(a); });
          return (
            <div className="card overflow-hidden">
              <div className={`px-5 py-3 border-b border-surface-100 flex items-center justify-between bg-surface-50`}>
                <div className="flex items-center gap-2">
                  <Icon size={16} className={color} />
                  <span className="font-semibold text-surface-800 text-sm">{title}</span>
                </div>
                <span className={`text-sm font-bold ${color}`}>LKR {total.toLocaleString("en-LK", { minimumFractionDigits: 2 })}</span>
              </div>
              {accounts.length === 0 ? (
                <div className="p-8 text-center text-surface-300 text-sm">{emptyMsg}</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-surface-50/50 border-b border-surface-100">
                    <tr>
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-surface-500">Account</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500">Category</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-surface-500">Notes</th>
                      <th className="text-right px-5 py-2.5 text-xs font-semibold text-surface-500">Balance (LKR)</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {accounts.map(acc => (
                      <tr key={acc.id} className="hover:bg-surface-50 group">
                        <td className="px-5 py-3 font-medium text-surface-800">{acc.name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                            acc.type === "asset" ? "bg-emerald-50 text-emerald-700" :
                            acc.type === "liability" ? "bg-red-50 text-red-700" : "bg-purple-50 text-purple-700"
                          }`}>{acc.category}</span>
                        </td>
                        <td className="px-4 py-3 text-surface-400 text-xs">{acc.notes ?? "—"}</td>
                        <td className={`px-5 py-3 text-right font-bold ${color}`}>
                          {parseFloat(acc.balance).toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openBsEdit(acc)} className="text-surface-400 hover:text-brand-500 transition-colors"><Pencil size={13} /></button>
                            <button
                              onClick={() => { if (confirm("Delete this account?")) bsDelete.mutate({ id: acc.id }); }}
                              disabled={bsDelete.isPending}
                              className="text-surface-300 hover:text-red-500 transition-colors disabled:opacity-40"
                            ><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-surface-50 border-t-2 border-surface-200">
                    <tr>
                      <td colSpan={3} className="px-5 py-3 text-xs font-bold text-surface-600 uppercase tracking-wider">Total {title}</td>
                      <td className={`px-5 py-3 text-right font-bold ${color}`}>
                        {total.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          );
        };

        return (
          <>
            {/* Summary tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
              <div className="card p-4 border-l-4 border-emerald-400">
                <p className="text-xs font-medium text-surface-500 mb-1">Total Assets</p>
                <p className="text-xl font-bold text-emerald-600">LKR {totalAssets.toLocaleString("en-LK", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="card p-4 border-l-4 border-red-400">
                <p className="text-xs font-medium text-surface-500 mb-1">Total Liabilities</p>
                <p className="text-xl font-bold text-red-600">LKR {totalLiabilities.toLocaleString("en-LK", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="card p-4 border-l-4 border-purple-400">
                <p className="text-xs font-medium text-surface-500 mb-1">Total Capital</p>
                <p className="text-xl font-bold text-purple-600">LKR {totalCapital.toLocaleString("en-LK", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className={`card p-4 border-l-4 ${balanced ? "border-green-400" : "border-amber-400"}`}>
                <p className="text-xs font-medium text-surface-500 mb-1">Balance Check</p>
                <p className={`text-sm font-bold ${balanced ? "text-green-600" : "text-amber-600"}`}>
                  {balanced ? "✓ Balanced" : "⚠ Not balanced"}
                </p>
                <p className="text-xs text-surface-400 mt-0.5">Assets = Liabilities + Capital</p>
              </div>
            </div>

            {/* Add / Edit form */}
            {bsShowForm && (
              <div className="card p-5 mb-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-surface-800">{bsEditId ? "Edit Account" : "Add Account"}</h3>
                  <button onClick={resetBsForm} className="text-surface-400 hover:text-surface-600"><X size={16} /></button>
                </div>
                <form onSubmit={handleBsSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Type */}
                  {!bsEditId && (
                    <div>
                      <label className="block text-xs font-medium text-surface-500 mb-1">Type *</label>
                      <select className="input text-sm" value={bsType} onChange={e => { setBsType(e.target.value as "asset"|"liability"|"capital"); setBsCategory(""); }} required>
                        <option value="asset">Asset</option>
                        <option value="liability">Liability</option>
                        <option value="capital">Capital</option>
                      </select>
                    </div>
                  )}
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-medium text-surface-500 mb-1">Category *</label>
                    <select className="input text-sm" value={bsCategory} onChange={e => setBsCategory(e.target.value)} required>
                      <option value="">— select —</option>
                      {bsCats.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-medium text-surface-500 mb-1">Account Name *</label>
                    <input type="text" className="input text-sm" placeholder="e.g. Bank of Ceylon Savings" value={bsName} onChange={e => setBsName(e.target.value)} required />
                  </div>
                  {/* Balance */}
                  <div>
                    <label className="block text-xs font-medium text-surface-500 mb-1">Balance (LKR) *</label>
                    <input type="number" step="0.01" className="input text-sm" placeholder="0.00" value={bsBalance} onChange={e => setBsBalance(e.target.value)} required />
                  </div>
                  {/* Notes */}
                  <div className={!bsEditId ? "lg:col-span-1" : "sm:col-span-2 lg:col-span-2"}>
                    <label className="block text-xs font-medium text-surface-500 mb-1">Notes</label>
                    <input type="text" className="input text-sm" placeholder="Optional description" value={bsNotes} onChange={e => setBsNotes(e.target.value)} />
                  </div>
                  {/* Buttons */}
                  <div className={`${!bsEditId ? "lg:col-span-3" : "sm:col-span-2 lg:col-span-3"} flex gap-2 justify-end`}>
                    <button type="button" onClick={resetBsForm} className="btn-secondary text-sm px-4 py-2">{t.common.cancel}</button>
                    <button type="submit" disabled={bsCreate.isPending || bsUpdate.isPending}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-xl transition-colors">
                      <Check size={14} /> {bsEditId ? "Save Changes" : "Add Account"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {bsLoading ? (
              <div className="card p-10 text-center text-surface-400 text-sm">{t.common.loading}</div>
            ) : (
              <div className="space-y-5">
                <Section title="Assets"      accounts={assets}      color="text-emerald-600" icon={Banknote}   emptyMsg="No asset accounts yet" />
                <Section title="Liabilities" accounts={liabilities} color="text-red-600"     icon={Building2}  emptyMsg="No liability accounts yet" />
                <Section title="Capital"     accounts={capital}     color="text-purple-600"  icon={Scale}      emptyMsg="No capital accounts yet" />
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
