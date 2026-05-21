"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Plus, Pencil, Trash2, X, Truck, BookOpen, Search,
  CreditCard, Banknote, FileText, ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/contexts/language-context";

type SupplierTier = "standard" | "silver" | "gold" | "platinum";
type SupplierForm = {
  name: string; contactName: string; phone: string;
  email: string; address: string; notes: string;
  tier: SupplierTier;
};
const emptyForm: SupplierForm = { name: "", contactName: "", phone: "", email: "", address: "", notes: "", tier: "standard" };

const TIER_STYLES: Record<SupplierTier, { label: string; badge: string }> = {
  standard: { label: "Standard",  badge: "bg-surface-100 text-surface-600" },
  silver:   { label: "Silver",    badge: "bg-slate-100 text-slate-700" },
  gold:     { label: "Gold",      badge: "bg-amber-100 text-amber-700" },
  platinum: { label: "Platinum",  badge: "bg-purple-100 text-purple-700" },
};

type TxType = "invoice" | "payment_cash" | "payment_cheque" | "credit_note" | "debit_note";
type TxForm = {
  type: TxType; amount: string; reference: string;
  chequeNumber: string; chequeDate: string; chequeBank: string; notes: string;
};
const emptyTx: TxForm = {
  type: "invoice", amount: "", reference: "",
  chequeNumber: "", chequeDate: "", chequeBank: "", notes: "",
};

const TX_LABELS: Record<TxType, string> = {
  invoice:        "Invoice (we owe)",
  payment_cash:   "Cash Payment",
  payment_cheque: "Cheque Payment",
  credit_note:    "Credit Note",
  debit_note:     "Debit Note",
};
const TX_COLORS: Record<TxType, string> = {
  invoice:        "text-red-600 bg-red-50",
  payment_cash:   "text-green-700 bg-green-50",
  payment_cheque: "text-blue-700 bg-blue-50",
  credit_note:    "text-emerald-700 bg-emerald-50",
  debit_note:     "text-orange-700 bg-orange-50",
};

function fmt(n: number) { return `LKR ${n.toFixed(2)}`; }

export default function SuppliersPage() {
  const { t } = useLanguage();
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState<SupplierForm>(emptyForm);
  const [search, setSearch]         = useState("");
  const [ledgerId, setLedgerId]     = useState<string | null>(null);
  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm]         = useState<TxForm>(emptyTx);

  const utils = trpc.useUtils();
  const { data: suppliers, isLoading } = trpc.suppliers.list.useQuery();

  const ledgerSupplier = suppliers?.find((s) => s.id === ledgerId);
  const txQuery = trpc.suppliers.listTransactions.useQuery(
    { supplierId: ledgerId! },
    { enabled: !!ledgerId },
  );

  const create = trpc.suppliers.create.useMutation({
    onSuccess: () => { toast.success("Supplier added!"); utils.suppliers.list.invalidate(); setShowForm(false); setForm(emptyForm); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.suppliers.update.useMutation({
    onSuccess: () => { toast.success("Supplier updated!"); utils.suppliers.list.invalidate(); setShowForm(false); setEditId(null); setForm(emptyForm); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.suppliers.delete.useMutation({
    onSuccess: () => { toast.success("Supplier deleted"); utils.suppliers.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const addTx = trpc.suppliers.addTransaction.useMutation({
    onSuccess: () => {
      toast.success("Transaction saved");
      utils.suppliers.listTransactions.invalidate({ supplierId: ledgerId! });
      setShowTxForm(false); setTxForm(emptyTx);
    },
    onError: (e) => toast.error(e.message),
  });
  const updateCheque = trpc.suppliers.updateChequeStatus.useMutation({
    onSuccess: () => {
      toast.success("Cheque status updated");
      utils.suppliers.listTransactions.invalidate({ supplierId: ledgerId! });
    },
    onError: (e) => toast.error(e.message),
  });

  const f = (label: string, key: keyof SupplierForm, type = "text") => (
    <div>
      <label className="block text-xs font-medium text-surface-600 mb-1">{label}</label>
      <input type={type} className="input" value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  const openEdit = (s: NonNullable<typeof suppliers>[number]) => {
    setEditId(s.id);
    setForm({ name: s.name, contactName: s.contactName ?? "", phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "", notes: s.notes ?? "", tier: (s.tier as SupplierTier) ?? "standard" });
    setShowForm(true);
  };

  const handleSave = () => {
    if (editId) update.mutate({ id: editId, ...form });
    else create.mutate(form);
  };

  const handleAddTx = () => {
    if (!ledgerId || !txForm.amount || parseFloat(txForm.amount) <= 0) return;
    addTx.mutate({ supplierId: ledgerId, ...txForm });
  };

  const txRows = txQuery.data ?? [];
  const currentBalance = txRows.length > 0 ? txRows[0].runningBalance : 0;
  const pendingCheques = txRows.filter((tx) => tx.type === "payment_cheque" && tx.chequeStatus === "pending");

  const filteredSuppliers = (suppliers ?? []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.contactName ?? "").toLowerCase().includes(q) ||
      (s.email ?? "").toLowerCase().includes(q) ||
      (s.phone ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <Truck size={22} className="text-brand-600" /> {t.suppliers.title}
          </h1>
          <p className="text-sm text-surface-400 mt-1">{suppliers?.length ?? 0} {t.suppliers.registered}</p>
        </div>
        <button onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> {t.suppliers.addSupplier}
        </button>
      </div>

      {/* Supplier form */}
      {showForm && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-surface-800">{editId ? t.suppliers.editSupplier : t.suppliers.newSupplier}</h2>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {f(t.suppliers.companyName, "name")}
            {f(t.suppliers.contactPerson, "contactName")}
            {f(t.suppliers.phone, "phone", "tel")}
            {f(t.suppliers.email, "email", "email")}
            <div className="col-span-2">{f(t.suppliers.addressField, "address")}</div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-surface-600 mb-1">{t.suppliers.notesField}</label>
              <textarea className="input min-h-[80px] resize-none" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Supplier Tier</label>
              <select className="input" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as SupplierTier })}>
                {(Object.entries(TIER_STYLES) as [SupplierTier, { label: string; badge: string }][]).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={!form.name || create.isPending || update.isPending} className="btn-primary">
              {create.isPending || update.isPending ? t.common.saving : editId ? t.suppliers.updateSupplier : t.suppliers.saveSupplier}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Ledger panel */}
      {ledgerId && ledgerSupplier && (
        <div className="card p-5 mb-6">
          {/* Ledger header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-brand-600" />
                <h2 className="font-semibold text-surface-800">{ledgerSupplier.name} — Ledger</h2>
              </div>
              <p className="text-xs text-surface-400 mt-0.5">Credit account &amp; cheque tracker</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-surface-500">Outstanding Balance</p>
                <p className={`text-xl font-bold ${currentBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                  {fmt(currentBalance)}
                </p>
                {currentBalance > 0 && <p className="text-xs text-red-400">We owe this supplier</p>}
              </div>
              <button onClick={() => { setLedgerId(null); setShowTxForm(false); }} className="text-surface-400 hover:text-surface-600">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Pending cheques alert */}
          {pendingCheques.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
                <Clock size={12} /> {pendingCheques.length} Pending Cheque{pendingCheques.length > 1 ? "s" : ""}
              </p>
              <div className="space-y-1">
                {pendingCheques.map((ch) => (
                  <div key={ch.id} className="flex items-center justify-between text-xs">
                    <span className="text-amber-700">
                      #{ch.chequeNumber} · {ch.chequeBank ?? "—"} · {ch.chequeDate ? new Date(ch.chequeDate).toLocaleDateString() : "—"} · <strong>{fmt(parseFloat(ch.amount))}</strong>
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => updateCheque.mutate({ id: ch.id, chequeStatus: "cleared" })}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-green-600 text-white text-[11px] font-medium">
                        <CheckCircle2 size={10} /> Cleared
                      </button>
                      <button onClick={() => updateCheque.mutate({ id: ch.id, chequeStatus: "bounced" })}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-600 text-white text-[11px] font-medium">
                        <XCircle size={10} /> Bounced
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add transaction toggle */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-surface-700">Transaction History</h3>
            <button onClick={() => setShowTxForm(!showTxForm)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium">
              <Plus size={12} /> Add Transaction
            </button>
          </div>

          {/* Add transaction form */}
          {showTxForm && (
            <div className="mb-4 p-4 rounded-xl bg-surface-50 border border-surface-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Type *</label>
                  <select className="input text-sm" value={txForm.type}
                    onChange={(e) => setTxForm({ ...txForm, type: e.target.value as TxType })}>
                    {(Object.entries(TX_LABELS) as [TxType, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Amount (LKR) *</label>
                  <input type="number" min="0.01" step="0.01" className="input text-sm" placeholder="0.00"
                    value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Reference / Invoice #</label>
                  <input type="text" className="input text-sm" placeholder="e.g. INV-001"
                    value={txForm.reference} onChange={(e) => setTxForm({ ...txForm, reference: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Notes</label>
                  <input type="text" className="input text-sm" placeholder="Optional"
                    value={txForm.notes} onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })} />
                </div>
                {txForm.type === "payment_cheque" && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">Cheque Number *</label>
                      <input type="text" className="input text-sm" placeholder="e.g. 001234"
                        value={txForm.chequeNumber} onChange={(e) => setTxForm({ ...txForm, chequeNumber: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">Cheque Date</label>
                      <input type="date" className="input text-sm"
                        value={txForm.chequeDate} onChange={(e) => setTxForm({ ...txForm, chequeDate: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-surface-600 mb-1">Bank</label>
                      <input type="text" className="input text-sm" placeholder="Bank name"
                        value={txForm.chequeBank} onChange={(e) => setTxForm({ ...txForm, chequeBank: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={handleAddTx} disabled={!txForm.amount || addTx.isPending} className="btn-primary text-sm px-3 py-1.5">
                  {addTx.isPending ? "Saving…" : "Save Transaction"}
                </button>
                <button onClick={() => { setShowTxForm(false); setTxForm(emptyTx); }} className="btn-secondary text-sm px-3 py-1.5">Cancel</button>
              </div>
            </div>
          )}

          {/* Ledger table */}
          {txQuery.isLoading ? (
            <p className="text-sm text-surface-400 text-center py-4">{t.common.loading}</p>
          ) : txRows.length === 0 ? (
            <p className="text-sm text-surface-300 text-center py-6">No transactions yet — add an invoice or payment above.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-surface-200">
              <table className="w-full text-xs">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="text-left px-3 py-2 text-surface-500 font-semibold">Date</th>
                    <th className="text-left px-3 py-2 text-surface-500 font-semibold">Type</th>
                    <th className="text-left px-3 py-2 text-surface-500 font-semibold">Reference</th>
                    <th className="text-right px-3 py-2 text-surface-500 font-semibold">Debit (↑ owe)</th>
                    <th className="text-right px-3 py-2 text-surface-500 font-semibold">Credit (↓ owe)</th>
                    <th className="text-right px-3 py-2 text-surface-500 font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {txRows.map((tx) => {
                    const isDebit = tx.type === "invoice" || tx.type === "debit_note";
                    const amt = parseFloat(tx.amount);
                    return (
                      <tr key={tx.id} className="hover:bg-surface-50">
                        <td className="px-3 py-2 text-surface-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${TX_COLORS[tx.type]}`}>
                            {tx.type === "invoice"        && <FileText size={10} />}
                            {tx.type === "payment_cash"   && <Banknote size={10} />}
                            {tx.type === "payment_cheque" && <CreditCard size={10} />}
                            {tx.type === "credit_note"    && <ArrowDownLeft size={10} />}
                            {tx.type === "debit_note"     && <ArrowUpRight size={10} />}
                            {TX_LABELS[tx.type]}
                          </span>
                          {tx.type === "payment_cheque" && tx.chequeStatus && (
                            <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              tx.chequeStatus === "cleared" ? "bg-green-100 text-green-700" :
                              tx.chequeStatus === "bounced" ? "bg-red-100 text-red-700" :
                              "bg-amber-100 text-amber-700"
                            }`}>{tx.chequeStatus}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-surface-500">
                          {tx.reference ?? "—"}
                          {tx.chequeNumber && <span className="ml-1 text-blue-500">#{tx.chequeNumber}</span>}
                          {tx.notes && <span className="block text-surface-400 italic">{tx.notes}</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-red-600 font-medium">{isDebit ? fmt(amt) : "—"}</td>
                        <td className="px-3 py-2 text-right text-green-600 font-medium">{!isDebit ? fmt(amt) : "—"}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${tx.runningBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                          {fmt(tx.runningBalance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Suppliers table */}
      <div className="card overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-surface-100">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              className="input pl-9 text-sm"
              placeholder="Search by name, contact, phone or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-surface-400 text-sm">{t.common.loading}</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-10 text-center text-surface-300">
            <Truck size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{search ? "No suppliers match your search" : t.suppliers.noSuppliersYet}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.suppliers.supplierName}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.suppliers.contactHeader}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.suppliers.emailPhoneHeader}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Tier</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filteredSuppliers.map((s) => (
                <tr key={s.id} className={`hover:bg-surface-50 ${ledgerId === s.id ? "bg-brand-50" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-surface-800">{s.name}</p>
                    {s.address && <p className="text-xs text-surface-400 truncate max-w-xs">{s.address}</p>}
                  </td>
                  <td className="px-4 py-3 text-surface-600">{s.contactName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <p className="text-surface-600 text-xs">{s.email ?? ""}</p>
                    <p className="text-surface-400 text-xs">{s.phone ?? ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const tier = (s.tier ?? "standard") as SupplierTier;
                      const { label, badge } = TIER_STYLES[tier];
                      return tier !== "standard" ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
                      ) : null;
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setLedgerId(ledgerId === s.id ? null : s.id)}
                        className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                          ledgerId === s.id ? "bg-brand-600 text-white" : "text-brand-600 hover:bg-brand-50 border border-brand-200"
                        }`}
                      >
                        <BookOpen size={12} /> Ledger
                      </button>
                      <button onClick={() => openEdit(s)} className="text-surface-400 hover:text-brand-600 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => { if (confirm(`Delete supplier "${s.name}"?`)) del.mutate({ id: s.id }); }}
                        className="text-surface-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
