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

  // Items state
  const [items, setItems] = useState<GRNItemForm[]>([]);
  const [currentItem, setCurrentItem] = useState<Omit<GRNItemForm, "id">>(EMPTY_ITEM);
  const [expanded, setExpanded] = useState(false);
  const [grnSearch, setGrnSearch] = useState("");

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
      setItems([]);
      setCurrentItem(EMPTY_ITEM);
      setTab("history");
    },
    onError: (e) => toast.error(e.message),
  });

  const selectedProduct = products?.find((p) => p.id === currentItem.productId);
  const preview = selectedProduct ? selectedProduct.stock + (parseInt(currentItem.quantity) || 0) : null;

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

  const fItem = (k: keyof typeof EMPTY_ITEM, v: string | boolean) =>
    setCurrentItem((prev) => ({ ...prev, [k]: v }));

  const handleAddItem = () => {
    if (!currentItem.productId) return toast.error("Select a product");
    const qty = parseInt(currentItem.quantity);
    if (!qty || qty < 1) return toast.error("Enter a valid quantity (min 1)");
    
    setItems((prev) => [...prev, { ...currentItem, id: crypto.randomUUID() }]);
    setCurrentItem(EMPTY_ITEM);
    setExpanded(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSubmit = () => {
    if (items.length === 0) return toast.error("Add at least one product to the GRN");
    
    const formattedItems = items.map((item) => ({
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
            {/* Add Item Form */}
            <div className="card p-5 space-y-4 border-l-4 border-l-brand-500">
              <h2 className="font-semibold text-surface-700 text-xs uppercase tracking-wider">Add Product to Receipt</h2>

              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.product}</label>
                <select className="input" value={currentItem.productId} onChange={(e) => fItem("productId", e.target.value)}>
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.quantityReceived}</label>
                  <input type="number" min="1" className="input" placeholder="1" value={currentItem.quantity}
                    onChange={(e) => fItem("quantity", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.condition}</label>
                  <select className="input" value={currentItem.condition} onChange={(e) => fItem("condition", e.target.value as Condition)}>
                    {CONDITIONS.map((c) => <option key={c} value={c}>{condLabel[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.unitCost}</label>
                  <input type="number" min="0" step="0.01" className="input" placeholder="0.00" value={currentItem.unitCost}
                    onChange={(e) => fItem("unitCost", e.target.value)} />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input type="checkbox" className="mt-0.5 accent-brand-600" checked={currentItem.updateCost}
                      disabled={!currentItem.unitCost} onChange={(e) => fItem("updateCost", e.target.checked)} />
                    <span className="text-xs font-semibold text-surface-700 block">{t.grn.updateCost}</span>
                  </label>
                </div>
              </div>

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
                      <input className="input" placeholder="LOT-2025-01" value={currentItem.batchNumber}
                        onChange={(e) => fItem("batchNumber", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.expiryDate}</label>
                      <input type="date" className="input" value={currentItem.expiryDate}
                        onChange={(e) => fItem("expiryDate", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.grn.itemNotes}</label>
                    <input className="input" placeholder="e.g. Minor packaging damage..." value={currentItem.itemNotes}
                      onChange={(e) => fItem("itemNotes", e.target.value)} />
                  </div>
                </div>
              )}

              <button onClick={handleAddItem} className="btn-secondary w-full flex items-center justify-center gap-2 py-2">
                <Plus size={16} /> Add to Receipt
              </button>
            </div>

            {/* Pending Items List */}
            {items.length > 0 && (
              <div className="card p-0 overflow-hidden border-2 border-brand-100">
                <div className="px-5 py-4 bg-brand-50 border-b border-brand-100 flex items-center justify-between">
                  <h3 className="font-bold text-brand-800">Pending Receipt Items ({items.length})</h3>
                  <span className="text-sm font-semibold text-brand-600">
                    Total Qty: {items.reduce((s, i) => s + parseInt(i.quantity || "0"), 0)}
                  </span>
                </div>
                <div className="divide-y divide-surface-100">
                  {items.map((item) => {
                    const prodName = products?.find(p => p.id === item.productId)?.name;
                    return (
                      <div key={item.id} className="p-4 flex items-center justify-between hover:bg-surface-50 transition-colors">
                        <div>
                          <p className="font-semibold text-surface-800 text-sm">{prodName}</p>
                          <div className="flex gap-3 text-xs text-surface-500 mt-1">
                            <span>Qty: <strong className="text-surface-700">{item.quantity}</strong></span>
                            {item.unitCost && <span>Cost: LKR {item.unitCost}</span>}
                            {item.condition !== "good" && <span className="text-amber-600 capitalize">{item.condition}</span>}
                          </div>
                        </div>
                        <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="p-5 bg-surface-50">
                  <button onClick={handleSubmit} disabled={createBulk.isPending}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm">
                    <Package size={18} />
                    {createBulk.isPending ? t.grn.saving : `Submit GRN (${items.length} items)`}
                  </button>
                </div>
              </div>
            )}
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
