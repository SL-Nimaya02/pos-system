"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { FileText, Plus, Package, ChevronDown, ChevronUp, Search } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/contexts/language-context";

const CONDITIONS = ["good", "damaged", "partial"] as const;
type Condition = typeof CONDITIONS[number];

const EMPTY_FORM = {
  supplierId:        "",
  supplierInvoiceNo: "",
  receivedDate:      new Date().toISOString().slice(0, 10),
  receivedBy:        "",
  notes:             "",
  productId:         "",
  quantity:          "1",
  unitCost:          "",
  updateCost:        false,
  batchNumber:       "",
  expiryDate:        "",
  condition:         "good" as Condition,
  itemNotes:         "",
};

export default function GRNPage() {
  const { t } = useLanguage();
  const [form, setForm]         = useState(EMPTY_FORM);
  const [expanded, setExpanded] = useState(false);
  const [grnSearch, setGrnSearch] = useState("");
  const utils = trpc.useUtils();

  const { data: products }  = trpc.products.list.useQuery({ activeOnly: false });
  const { data: suppliers } = trpc.suppliers.list.useQuery();
  const { data: history }   = trpc.grn.list.useQuery();

  const create = trpc.grn.create.useMutation({
    onSuccess: (grn) => {
      toast.success(`GRN ${grn.grnNumber} recorded`);
      utils.grn.list.invalidate();
      utils.products.list.invalidate();
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const selectedProduct = products?.find((p) => p.id === form.productId);
  const preview = selectedProduct ? selectedProduct.stock + (parseInt(form.quantity) || 0) : null;

  const filteredGRN = (history ?? []).filter((grn) => {
    if (!grnSearch) return true;
    const q = grnSearch.toLowerCase();
    return (
      grn.grnNumber.toLowerCase().includes(q) ||
      (grn.supplier?.name ?? "").toLowerCase().includes(q) ||
      (grn.supplierInvoiceNo ?? "").toLowerCase().includes(q) ||
      grn.items.some((item) => item.productName.toLowerCase().includes(q))
    );
  });

  const f = (k: keyof typeof EMPTY_FORM, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = () => {
    if (!form.productId) return toast.error("Select a product");
    const qty = parseInt(form.quantity);
    if (!qty || qty < 1) return toast.error("Enter a valid quantity (min 1)");
    create.mutate({
      supplierId:        form.supplierId        || undefined,
      supplierInvoiceNo: form.supplierInvoiceNo || undefined,
      receivedDate:      form.receivedDate,
      receivedBy:        form.receivedBy        || undefined,
      notes:             form.notes             || undefined,
      productId:         form.productId,
      productName:       selectedProduct?.name ?? "",
      quantityReceived:  qty,
      unitCost:          form.unitCost          || undefined,
      updateCost:        form.updateCost,
      batchNumber:       form.batchNumber       || undefined,
      expiryDate:        form.expiryDate        || undefined,
      condition:         form.condition,
      itemNotes:         form.itemNotes         || undefined,
    });
  };

  const condLabel: Record<Condition, string> = {
    good:    t.grn.conditionGood,
    damaged: t.grn.conditionDamaged,
    partial: t.grn.conditionPartial,
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <FileText size={24} className="text-brand-600" /> {t.grn.stockInTitle}
        </h1>
        <p className="text-sm text-surface-400 mt-1">{t.grn.recordIncoming}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Form ── */}
        <div className="space-y-4">

          {/* Receipt Header */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-surface-700 text-xs uppercase tracking-wider">{t.grn.headerSection}</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.supplier}</label>
                <select className="input" value={form.supplierId} onChange={(e) => f("supplierId", e.target.value)}>
                  <option value="">— None —</option>
                  {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.invoiceNo}</label>
                <input className="input" placeholder="INV-00001" value={form.supplierInvoiceNo}
                  onChange={(e) => f("supplierInvoiceNo", e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.receivedDate} *</label>
                <input type="date" className="input" value={form.receivedDate}
                  onChange={(e) => f("receivedDate", e.target.value)} />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.receivedBy}</label>
                <input className="input" placeholder="Name of person who received" value={form.receivedBy}
                  onChange={(e) => f("receivedBy", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Item Details */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-surface-700 text-xs uppercase tracking-wider">{t.grn.itemSection}</h2>

            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.product}</label>
              <select className="input" value={form.productId} onChange={(e) => f("productId", e.target.value)}>
                <option value="">Select a product...</option>
                {products?.map((p) => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
              </select>
            </div>

            {selectedProduct && (
              <div className="bg-brand-50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center shrink-0">
                  <Package size={16} className="text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-800">{selectedProduct.name}</p>
                  <p className="text-xs text-surface-500">
                    {t.grn.current}: <strong>{selectedProduct.stock}</strong>
                    {" → "}
                    {t.grn.after}: <strong className="text-brand-700">{preview}</strong>
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.quantityReceived}</label>
                <input type="number" min="1" className="input" placeholder="1" value={form.quantity}
                  onChange={(e) => f("quantity", e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.condition}</label>
                <select className="input" value={form.condition} onChange={(e) => f("condition", e.target.value as Condition)}>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{condLabel[c]}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.unitCost}</label>
                <input type="number" min="0" step="0.01" className="input" placeholder="0.00" value={form.unitCost}
                  onChange={(e) => f("unitCost", e.target.value)} />
              </div>

              <div className="flex items-end pb-2">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input type="checkbox" className="mt-0.5 accent-brand-600" checked={form.updateCost}
                    disabled={!form.unitCost} onChange={(e) => f("updateCost", e.target.checked)} />
                  <div>
                    <span className="text-xs font-semibold text-surface-700 block">{t.grn.updateCost}</span>
                    <span className="text-xs text-surface-400">{t.grn.updateCostHint}</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Optional fields accordion */}
            <button type="button" onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? "Hide optional fields" : "Show optional fields (Batch, Expiry, Notes)"}
            </button>

            {expanded && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.batchNumber}</label>
                    <input className="input" placeholder="LOT-2025-01" value={form.batchNumber}
                      onChange={(e) => f("batchNumber", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.expiryDate}</label>
                    <input type="date" className="input" value={form.expiryDate}
                      onChange={(e) => f("expiryDate", e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.itemNotes}</label>
                  <input className="input" placeholder="e.g. Minor packaging damage..." value={form.itemNotes}
                    onChange={(e) => f("itemNotes", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.notesOptional}</label>
                  <input className="input" placeholder={t.grn.notesPlaceholder} value={form.notes}
                    onChange={(e) => f("notes", e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <button onClick={handleSubmit} disabled={create.isPending}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            <Plus size={16} />
            {create.isPending ? t.grn.saving : t.grn.recordStockIn}
          </button>
        </div>

        {/* ── GRN History ── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-surface-800">{t.grn.sessionHistory}</h2>
            <div className="relative w-48">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                className="input pl-8 text-xs py-1.5"
                placeholder="Search GRN, product…"
                value={grnSearch}
                onChange={(e) => setGrnSearch(e.target.value)}
              />
            </div>
          </div>
          {!history || filteredGRN.length === 0 ? (
            <div className="text-center py-12 text-surface-300">
              <FileText size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">{grnSearch ? "No GRN records match your search" : t.grn.noGRNHistory}</p>
            </div>
          ) : (
            <div className="space-y-0 overflow-auto max-h-[720px]">
              {filteredGRN.map((grn) => (
                <div key={grn.id} className="py-3 border-b border-surface-100 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-surface-800">{grn.grnNumber}</p>
                      {grn.supplier && <p className="text-xs text-surface-500">{grn.supplier.name}</p>}
                      {grn.supplierInvoiceNo && <p className="text-xs text-surface-400">Inv: {grn.supplierInvoiceNo}</p>}
                      <p className="text-xs text-surface-400 mt-0.5">
                        {new Date(grn.receivedDate).toLocaleDateString()}
                        {grn.receivedBy && ` · ${grn.receivedBy}`}
                      </p>
                    </div>
                    <span className="text-xs text-surface-400 shrink-0">
                      {grn.items.length} item{grn.items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {grn.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-surface-50 rounded-lg px-3 py-1.5">
                        <div>
                          <p className="text-xs font-medium text-surface-700">{item.productName}</p>
                          <div className="flex gap-2 text-xs text-surface-400 flex-wrap">
                            {item.batchNumber && <span>Batch: {item.batchNumber}</span>}
                            {item.expiryDate && <span>Exp: {new Date(item.expiryDate).toLocaleDateString()}</span>}
                            {item.condition !== "good" && (
                              <span className="text-amber-600 font-medium capitalize">{item.condition}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">+{item.quantityReceived}</span>
                          {item.unitCost && <p className="text-xs text-surface-400 mt-0.5">@ Rs.{item.unitCost}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
