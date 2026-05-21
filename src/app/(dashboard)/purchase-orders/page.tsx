"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, X, Trash2, ClipboardList, ChevronDown, PackageCheck, Search } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/contexts/language-context";

type LineItem = { productId: string; productName: string; quantity: number; unitCost: string };

const STATUS_FLOW = ["draft", "ordered", "received", "cancelled"] as const;
type POStatus = typeof STATUS_FLOW[number];

const statusStyle: Record<POStatus, string> = {
  draft: "bg-surface-100 text-surface-600",
  ordered: "bg-blue-100 text-blue-700",
  received: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

const nextStatus: Record<string, POStatus | null> = {
  draft: "ordered",
  ordered: "received",
  received: null,
  cancelled: null,
};

const nextLabel: Record<string, string> = {
  draft: "Mark as Ordered",
  ordered: "Mark as Received (adds stock)",
};

export default function PurchaseOrdersPage() {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);

  const utils = trpc.useUtils();
  const { data: pos, isLoading } = trpc.purchaseOrders.list.useQuery();
  const { data: suppliers } = trpc.suppliers.list.useQuery();
  const { data: products } = trpc.products.list.useQuery({ activeOnly: false });

  const create = trpc.purchaseOrders.create.useMutation({
    onSuccess: (po) => {
      toast.success(`${po.poNumber} created!`);
      utils.purchaseOrders.list.invalidate();
      setShowForm(false);
      setSupplierId(""); setNotes(""); setExpectedDate(""); setLines([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = trpc.purchaseOrders.updateStatus.useMutation({
    onSuccess: (po) => {
      toast.success(`${po.poNumber} → ${po.status}`);
      utils.purchaseOrders.list.invalidate();
      utils.products.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const del = trpc.purchaseOrders.delete.useMutation({
    onSuccess: () => { toast.success("PO deleted"); utils.purchaseOrders.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const addLine = () => setLines([...lines, { productId: "", productName: "", quantity: 1, unitCost: "" }]);

  const updateLine = (i: number, patch: Partial<LineItem>) =>
    setLines(lines.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const handleProductSelect = (i: number, productId: string) => {
    const product = products?.find((p) => p.id === productId);
    updateLine(i, {
      productId,
      productName: product?.name ?? "",
      unitCost: product?.cost ?? product?.price ?? "",
    });
  };

  const totalAmount = lines.reduce(
    (s, l) => s + (parseFloat(l.unitCost) || 0) * l.quantity, 0
  );

  const filteredPOs = (pos ?? []).filter((po) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      po.poNumber.toLowerCase().includes(q) ||
      (po.supplier?.name ?? "").toLowerCase().includes(q) ||
      (po.notes ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <ClipboardList size={22} className="text-brand-600" /> {t.purchaseOrders.title}
          </h1>
          <p className="text-sm text-surface-400 mt-1">{pos?.length ?? 0} purchase orders</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> {t.purchaseOrders.newPO}
        </button>
      </div>

      {/* Create PO Form */}
      {showForm && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-surface-800">{t.purchaseOrders.newPurchaseOrder}</h2>
            <button onClick={() => setShowForm(false)} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">{t.purchaseOrders.supplier}</label>
              <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">No supplier</option>
                {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">{t.purchaseOrders.expectedDate}</label>
              <input type="date" className="input" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">{t.purchaseOrders.notes}</label>
              <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-surface-700">{t.purchaseOrders.lineItems}</h3>
              <button onClick={addLine} className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1">
                <Plus size={13} /> {t.purchaseOrders.addItem}
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="border-2 border-dashed border-surface-200 rounded-xl p-6 text-center text-surface-400 text-sm">
                Click &ldquo;Add Item&rdquo; to add products to this PO
              </div>
            ) : (
              <div className="space-y-2">
                {lines.map((line, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
                    <select
                      className="input flex-1 text-sm"
                      value={line.productId}
                      onChange={(e) => handleProductSelect(i, e.target.value)}
                    >
                      <option value="">Select product</option>
                      {products?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="w-24">
                      <input type="number" className="input text-sm text-center" placeholder="Qty" min={1}
                        value={line.quantity} onChange={(e) => updateLine(i, { quantity: parseInt(e.target.value) || 1 })} />
                    </div>
                    <div className="w-28">
                      <input type="number" className="input text-sm text-right" placeholder="Unit cost"
                        value={line.unitCost} onChange={(e) => updateLine(i, { unitCost: e.target.value })} />
                    </div>
                    <span className="text-sm font-semibold text-surface-700 w-24 text-right shrink-0">
                      LKR {((parseFloat(line.unitCost) || 0) * line.quantity).toFixed(2)}
                    </span>
                    <button onClick={() => removeLine(i)} className="text-surface-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex justify-end pt-2 border-t border-surface-100">
                  <span className="text-sm font-bold text-surface-800">
                    Total: LKR {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => create.mutate({ supplierId: supplierId || undefined, notes, expectedDate, items: lines.filter(l => l.productId && l.unitCost) })}
              disabled={lines.filter(l => l.productId && l.unitCost).length === 0 || create.isPending}
              className="btn-primary"
            >
              {create.isPending ? t.common.saving : t.purchaseOrders.createPO}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* PO List */}
      <div className="card overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-surface-100">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              className="input pl-9 text-sm"
              placeholder="Search by PO number or supplier…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-surface-400 text-sm">{t.common.loading}</div>
        ) : filteredPOs.length === 0 ? (
          <div className="p-10 text-center text-surface-300">
            <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{search ? "No purchase orders match your search" : "No purchase orders yet"}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.purchaseOrders.orderNo}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.purchaseOrders.supplier}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">{t.orders.itemsHeader}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.purchaseOrders.expectedDate}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">{t.common.status}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">{t.orders.totalHeader}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filteredPOs.map((po) => (
                <tr key={po.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3 font-mono font-semibold text-surface-700 text-xs">{po.poNumber}</td>
                  <td className="px-4 py-3 text-surface-600">{po.supplier?.name ?? <span className="text-surface-300">—</span>}</td>
                  <td className="px-4 py-3 text-center text-surface-600">{po.items.length}</td>
                  <td className="px-4 py-3 text-surface-500 text-xs">
                    {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusStyle[po.status as POStatus]}`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-surface-800">
                    LKR {parseFloat(po.totalAmount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {nextStatus[po.status] && (
                        <button
                          onClick={() => updateStatus.mutate({ id: po.id, status: nextStatus[po.status]! })}
                          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                            po.status === "ordered" ? "bg-green-600 text-white hover:bg-green-700" : "bg-brand-600 text-white hover:bg-brand-700"
                          }`}
                        >
                          {po.status === "ordered" && <PackageCheck size={12} />}
                          {po.status === "draft" ? t.purchaseOrders.markAsOrdered : t.purchaseOrders.markAsReceived}
                        </button>
                      )}
                      {po.status === "draft" && (
                        <button
                          onClick={() => { if (confirm("Cancel this PO?")) updateStatus.mutate({ id: po.id, status: "cancelled" }); }}
                          className="text-xs text-surface-400 hover:text-red-500 px-2 py-1.5 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      {(po.status === "cancelled" || po.status === "draft") && (
                        <button onClick={() => { if (confirm("Delete this PO?")) del.mutate({ id: po.id }); }}
                          className="text-surface-300 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
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
