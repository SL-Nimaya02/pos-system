"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { FileText, Plus, Package, ChevronDown, ChevronUp, Search, Trash2, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/contexts/language-context";

const CONDITIONS = ["good", "damaged", "partial"] as const;
type Condition = typeof CONDITIONS[number];

type GRNItemForm = {
  id: string; // temp id for UI
  productId: string;
  quantity: string;
  unitCost: string;
  updateCost: boolean;
  batchNumber: string;
  expiryDate: string;
  condition: Condition;
  itemNotes: string;
};

const EMPTY_ITEM: Omit<GRNItemForm, "id"> = {
  productId: "",
  quantity: "1",
  unitCost: "",
  updateCost: false,
  batchNumber: "",
  expiryDate: "",
  condition: "good",
  itemNotes: "",
};

export default function GRNPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"record" | "history" | "supplier">("record");
  
  // Header state
  const [supplierId, setSupplierId] = useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [receivedBy, setReceivedBy] = useState("");
  const [notes, setNotes] = useState("");

  // Items state — start with one empty row
  const [items, setItems] = useState<GRNItemForm[]>([{ ...EMPTY_ITEM, id: crypto.randomUUID() }]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [grnSearch, setGrnSearch] = useState("");

  const newRow = (): GRNItemForm => ({ ...EMPTY_ITEM, id: crypto.randomUUID() });

  const updateItem = (id: string, key: keyof Omit<GRNItemForm, "id">, value: string | boolean) =>
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, [key]: value } : it));

  const addRow = () => setItems((prev) => [...prev, newRow()]);

  const toggleRowExpand = (id: string) =>
    setExpandedRows((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  // On Tab from last field of last row → add new row
  const handleLastFieldTab = (e: React.KeyboardEvent, rowId: string) => {
    if (e.key === "Tab" && !e.shiftKey && rowId === items[items.length - 1]?.id) {
      e.preventDefault();
      addRow();
      setTimeout(() => {
        const selects = document.querySelectorAll<HTMLSelectElement>(".grn-product-select");
        selects[selects.length - 1]?.focus();
      }, 50);
    }
  };

  const utils = trpc.useUtils();

  const { data: products }  = trpc.products.list.useQuery({ activeOnly: false });
  const { data: suppliers } = trpc.suppliers.list.useQuery();
  const { data: history }   = trpc.grn.list.useQuery();
  const { data: supplierSummary } = trpc.grn.supplierSummary.useQuery();

  const createBulk = trpc.grn.createBulk.useMutation({
    onSuccess: (grn) => {
      toast.success(`GRN ${grn?.grnNumber} recorded successfully`);
      utils.grn.list.invalidate();
      utils.grn.supplierSummary.invalidate();
      utils.products.list.invalidate();
      // Reset form
      setSupplierInvoiceNo("");
      setNotes("");
      setItems([newRow()]);
      setExpandedRows(new Set());
      setTab("history");
    },
    onError: (e) => toast.error(e.message),
  });

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

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.length <= 1 ? [newRow()] : prev.filter((i) => i.id !== id));
    setExpandedRows((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handleSubmit = () => {
    const filledItems = items.filter((item) => item.productId.trim() !== "");
    if (filledItems.length === 0) return toast.error("Add at least one product to the GRN");
    
    const formattedItems = filledItems.map((item) => ({
      productId: item.productId,
      productName: products?.find(p => p.id === item.productId)?.name ?? "Unknown",
      quantityReceived: parseInt(item.quantity),
      unitCost: item.unitCost || undefined,
      updateCost: item.updateCost,
      batchNumber: item.batchNumber || undefined,
      expiryDate: item.expiryDate || undefined,
      condition: item.condition,
      itemNotes: item.itemNotes || undefined,
    }));

    createBulk.mutate({
      supplierId: supplierId || undefined,
      supplierInvoiceNo: supplierInvoiceNo || undefined,
      receivedDate,
      receivedBy: receivedBy || undefined,
      notes: notes || undefined,
      items: formattedItems as any,
    });
  };

  const condLabel: Record<Condition, string> = {
    good:    t.grn.conditionGood,
    damaged: t.grn.conditionDamaged,
    partial: t.grn.conditionPartial,
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <FileText size={24} className="text-brand-600" /> {t.grn.stockInTitle}
          </h1>
          <p className="text-sm text-surface-400 mt-1">Manage goods receipts and supplier performance.</p>
        </div>
        <div className="flex bg-surface-100 p-1 rounded-xl w-max">
          <button onClick={() => setTab("record")} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === "record" ? "bg-white text-brand-700 shadow-sm" : "text-surface-600 hover:text-surface-900"}`}>Record GRN</button>
          <button onClick={() => setTab("history")} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === "history" ? "bg-white text-brand-700 shadow-sm" : "text-surface-600 hover:text-surface-900"}`}>History</button>
          <button onClick={() => setTab("supplier")} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === "supplier" ? "bg-white text-brand-700 shadow-sm" : "text-surface-600 hover:text-surface-900"}`}>Supplier Report</button>
        </div>
      </div>

      {tab === "record" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4">
            {/* Header Form */}
            <div className="card p-5 space-y-4">
              <h2 className="font-semibold text-surface-700 text-xs uppercase tracking-wider">{t.grn.headerSection}</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.supplier}</label>
                  <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                    <option value="">— None —</option>
                    {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.invoiceNo}</label>
                  <input className="input" placeholder="INV-00001" value={supplierInvoiceNo} onChange={(e) => setSupplierInvoiceNo(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.receivedDate} *</label>
                  <input type="date" className="input" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.receivedBy}</label>
                  <input className="input" placeholder="Name of person who received" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">General Notes</label>
                  <textarea className="input py-2 h-20 resize-none" placeholder="Delivery notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-4">
            {/* Inline editable items table */}
            <div className="card overflow-hidden border-l-4 border-l-brand-500">
              <div className="px-5 py-3 bg-brand-50 border-b border-brand-100 flex items-center justify-between">
                <h2 className="font-semibold text-surface-700 text-xs uppercase tracking-wider">Receipt Items</h2>
                <span className="text-xs text-brand-600 font-semibold">
                  {items.filter(i => i.productId).length} item{items.filter(i => i.productId).length !== 1 ? "s" : ""} added
                </span>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[2fr_80px_110px_100px_36px_36px] gap-1 px-3 py-2 bg-surface-50 border-b border-surface-200 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                <span>Product</span>
                <span>Qty</span>
                <span>Unit Cost</span>
                <span>Condition</span>
                <span></span>
                <span></span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-surface-100">
                {items.map((item, idx) => {
                  const prod = products?.find((p) => p.id === item.productId);
                  const isExpanded = expandedRows.has(item.id);
                  const isLast = idx === items.length - 1;
                  return (
                    <div key={item.id}>
                      <div className="grid grid-cols-[2fr_80px_110px_100px_36px_36px] gap-1 px-3 py-2 items-center">
                        {/* Product */}
                        <select
                          className="grn-product-select input py-1.5 text-sm"
                          value={item.productId}
                          onChange={(e) => updateItem(item.id, "productId", e.target.value)}
                        >
                          <option value="">Select product…</option>
                          {products?.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.stock})</option>
                          ))}
                        </select>
                        {/* Qty */}
                        <input
                          type="number" min="1"
                          className="input py-1.5 text-sm text-center"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                        />
                        {/* Unit Cost */}
                        <input
                          type="number" min="0" step="0.01"
                          className="input py-1.5 text-sm"
                          placeholder="0.00"
                          value={item.unitCost}
                          onChange={(e) => updateItem(item.id, "unitCost", e.target.value)}
                        />
                        {/* Condition */}
                        <select
                          className="input py-1.5 text-sm"
                          value={item.condition}
                          onChange={(e) => updateItem(item.id, "condition", e.target.value as Condition)}
                          onKeyDown={(e) => isLast && handleLastFieldTab(e, item.id)}
                        >
                          {CONDITIONS.map((c) => <option key={c} value={c}>{condLabel[c]}</option>)}
                        </select>
                        {/* Expand optional fields */}
                        <button
                          type="button"
                          onClick={() => toggleRowExpand(item.id)}
                          className={`p-1 rounded-lg text-xs transition-colors ${
                            isExpanded ? "text-brand-600 bg-brand-50" : "text-surface-400 hover:text-brand-600 hover:bg-brand-50"
                          }`}
                          title="Batch / Expiry / Notes"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 rounded-lg text-surface-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Stock preview */}
                      {prod && (
                        <div className="px-3 pb-1.5">
                          <span className="text-xs text-surface-400">
                            Stock: {prod.stock} → <strong className="text-brand-600">{prod.stock + (parseInt(item.quantity) || 0)}</strong>
                            {item.unitCost && (
                              <label className="ml-4 inline-flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="accent-brand-600"
                                  checked={item.updateCost}
                                  onChange={(e) => updateItem(item.id, "updateCost", e.target.checked)}
                                />
                                <span>Update product cost</span>
                              </label>
                            )}
                          </span>
                        </div>
                      )}

                      {/* Optional fields */}
                      {isExpanded && (
                        <div className="grid grid-cols-3 gap-2 px-3 pb-3 pt-1 bg-surface-50 border-t border-surface-100">
                          <div>
                            <label className="block text-xs font-semibold text-surface-500 mb-1">{t.grn.batchNumber}</label>
                            <input className="input py-1.5 text-sm" placeholder="LOT-001" value={item.batchNumber}
                              onChange={(e) => updateItem(item.id, "batchNumber", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-surface-500 mb-1">{t.grn.expiryDate}</label>
                            <input type="date" className="input py-1.5 text-sm" value={item.expiryDate}
                              onChange={(e) => updateItem(item.id, "expiryDate", e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-surface-500 mb-1">{t.grn.itemNotes}</label>
                            <input className="input py-1.5 text-sm" placeholder="Notes…" value={item.itemNotes}
                              onChange={(e) => updateItem(item.id, "itemNotes", e.target.value)} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add row + Submit */}
              <div className="px-3 py-3 border-t border-surface-100 bg-surface-50 flex items-center gap-3">
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={15} /> Add Row
                </button>
                <div className="flex-1" />
                <div className="text-right">
                  <p className="text-xs text-surface-400 mb-1">
                    Total qty: <strong>{items.filter(i => i.productId).reduce((s, i) => s + (parseInt(i.quantity) || 0), 0)}</strong>
                  </p>
                  <button
                    onClick={handleSubmit}
                    disabled={createBulk.isPending || items.filter(i => i.productId).length === 0}
                    className="btn-primary flex items-center gap-2 px-5 py-2 text-sm disabled:opacity-50"
                  >
                    <Package size={16} />
                    {createBulk.isPending ? t.grn.saving : `Submit GRN (${items.filter(i => i.productId).length} items)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="card p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
            <h2 className="font-semibold text-surface-800 text-lg">Goods Receipts History</h2>
            <div className="relative w-full md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                className="input pl-9 text-sm py-2"
                placeholder="Search GRN, supplier, product…"
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
            <div className="space-y-4 overflow-auto">
              {filteredGRN.map((grn) => (
                <div key={grn.id} className="border border-surface-200 rounded-xl overflow-hidden">
                  <div className="bg-surface-50 px-5 py-3 flex items-start justify-between border-b border-surface-200">
                    <div>
                      <p className="text-sm font-bold text-brand-700">{grn.grnNumber}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {grn.supplier ? (
                          <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{grn.supplier.name}</span>
                        ) : (
                          <span className="text-xs font-semibold bg-surface-200 text-surface-600 px-2 py-0.5 rounded-full">No Supplier</span>
                        )}
                        {grn.supplierInvoiceNo && <span className="text-xs text-surface-500">Inv: {grn.supplierInvoiceNo}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-surface-600">
                        {new Date(grn.receivedDate).toLocaleDateString()}
                      </p>
                      {grn.receivedBy && <p className="text-xs text-surface-400 mt-0.5">By {grn.receivedBy}</p>}
                    </div>
                  </div>
                  <div className="p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-white border-b border-surface-100">
                        <tr>
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-surface-500">Product</th>
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-surface-500">Details</th>
                          <th className="text-right px-5 py-2.5 text-xs font-semibold text-surface-500">Qty</th>
                          <th className="text-right px-5 py-2.5 text-xs font-semibold text-surface-500">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100 bg-white">
                        {grn.items.map((item) => (
                          <tr key={item.id} className="hover:bg-surface-50 transition-colors">
                            <td className="px-5 py-3 text-surface-800 font-medium">{item.productName}</td>
                            <td className="px-5 py-3 text-xs text-surface-500">
                              <div className="flex gap-2 flex-wrap">
                                {item.batchNumber && <span>Batch: {item.batchNumber}</span>}
                                {item.condition !== "good" && <span className="text-amber-600 capitalize">{item.condition}</span>}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold text-xs">
                                +{item.quantityReceived}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right text-surface-600 font-medium">
                              {item.unitCost ? `LKR ${parseFloat(item.unitCost).toFixed(2)}` : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "supplier" && (
        <div className="card p-5">
          <div className="mb-6">
            <h2 className="font-semibold text-surface-800 text-lg flex items-center gap-2">
              <Users size={20} className="text-blue-600" /> GRN Supplier Performance
            </h2>
            <p className="text-sm text-surface-500 mt-1">Aggregated statistics of goods received per supplier.</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Supplier</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Total GRNs</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Unique Items</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Total Units Recv</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Est. Value (LKR)</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {supplierSummary?.map((s) => (
                  <tr key={s.supplierId || "none"} className="hover:bg-surface-50">
                    <td className="px-4 py-4 font-bold text-surface-800">{s.supplierName}</td>
                    <td className="px-4 py-4 text-center text-surface-600 font-medium">{s.grnCount}</td>
                    <td className="px-4 py-4 text-center text-surface-600">{s.totalItems}</td>
                    <td className="px-4 py-4 text-center font-bold text-brand-600">{s.totalQty}</td>
                    <td className="px-4 py-4 text-right text-surface-800 font-medium">{s.totalValue.toFixed(2)}</td>
                    <td className="px-4 py-4 text-right text-surface-500 text-xs">{new Date(s.lastGRN).toLocaleDateString()}</td>
                  </tr>
                ))}
                {(!supplierSummary || supplierSummary.length === 0) && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-surface-400">No supplier data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
