"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { FileText, Plus, Package } from "lucide-react";
import toast from "react-hot-toast";

interface GRNEntry { productName: string; quantity: number; time: string; }

export default function GRNPage() {
  const [form, setForm] = useState({ productId: "", quantity: "1", note: "" });
  const [history, setHistory] = useState<GRNEntry[]>([]);
  const utils = trpc.useUtils();

  const { data: products } = trpc.products.list.useQuery({ activeOnly: false });
  const adjustStock = trpc.products.adjustStock.useMutation({
    onSuccess: (_, vars) => {
      const name = products?.find((p) => p.id === vars.id)?.name ?? "Product";
      toast.success(`Added ${vars.quantityAdded} units to ${name}`);
      setHistory((prev) => [{ productName: name, quantity: vars.quantityAdded, time: new Date().toLocaleTimeString() }, ...prev]);
      utils.products.list.invalidate();
      setForm({ productId: "", quantity: "1", note: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const selectedProduct = products?.find((p) => p.id === form.productId);
  const preview = selectedProduct ? selectedProduct.stock + (parseInt(form.quantity) || 0) : null;

  const handleSubmit = () => {
    if (!form.productId) return toast.error("Select a product");
    const qty = parseInt(form.quantity);
    if (!qty || qty < 1) return toast.error("Enter a valid quantity (min 1)");
    adjustStock.mutate({ id: form.productId, quantityAdded: qty });
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <FileText size={24} className="text-brand-600" /> GRN — Stock In
        </h1>
        <p className="text-sm text-surface-400 mt-1">Record incoming stock from suppliers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-surface-800">Add Stock</h2>

          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">Product *</label>
            <select
              className="input"
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
            >
              <option value="">Select a product...</option>
              {products?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock: {p.stock})
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="bg-brand-50 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                <Package size={18} className="text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-surface-800">{selectedProduct.name}</p>
                <p className="text-xs text-surface-500">
                  Current: <strong>{selectedProduct.stock}</strong>
                  {" → "}
                  After: <strong className="text-brand-700">{preview}</strong>
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">Quantity Received *</label>
            <input
              type="number"
              min="1"
              className="input"
              placeholder="Enter quantity"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">Note (optional)</label>
            <input
              className="input"
              placeholder="e.g. Supplier delivery, manual recount..."
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={adjustStock.isPending}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            <Plus size={16} />
            {adjustStock.isPending ? "Saving..." : "Record Stock In"}
          </button>
        </div>

        {/* Session History */}
        <div className="card p-6">
          <h2 className="font-semibold text-surface-800 mb-4">Session History</h2>
          {history.length === 0 ? (
            <div className="text-center py-12 text-surface-300">
              <FileText size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No stock added yet this session</p>
            </div>
          ) : (
            <div className="space-y-0">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-surface-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-surface-700">{h.productName}</p>
                    <p className="text-xs text-surface-400">{h.time}</p>
                  </div>
                  <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    +{h.quantity} units
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
