"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";

export default function ProductsPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: "",
    cost: "",
    stock: "0",
    sku: "",
    description: "",
    taxRate: "10",
  });

  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.products.list.useQuery({ activeOnly: false });
  const { data: categories } = trpc.categories.list.useQuery();

  const createProduct = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Product created!");
      utils.products.list.invalidate();
      setShowForm(false);
      setForm({ name: "", price: "", cost: "", stock: "0", sku: "", description: "", taxRate: "10" });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Updated!");
      utils.products.list.invalidate();
    },
  });

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Products</h1>
          <p className="text-sm text-surface-400">{products?.length ?? 0} total products</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Add Product Form */}
      {showForm && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-surface-800 mb-4">New Product</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Name *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">SKU</label>
              <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Price *</label>
              <input className="input" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Cost</label>
              <input className="input" type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Stock</label>
              <input className="input" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Tax Rate (%)</label>
              <input className="input" type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-surface-600 mb-1">Category</label>
              <select className="input">
                <option value="">No category</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => createProduct.mutate({ ...form, stock: parseInt(form.stock) })}
              disabled={!form.name || !form.price || createProduct.isPending}
              className="btn-primary"
            >
              {createProduct.isPending ? "Saving..." : "Save Product"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Product Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-surface-400 text-sm">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Product</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Stock</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {products?.map((p) => (
                <tr key={p.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-surface-800">{p.name}</p>
                    {p.sku && <p className="text-xs text-surface-400">SKU: {p.sku}</p>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-brand-600">
                    ${parseFloat(p.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${p.stock <= 0 ? "text-red-500" : p.stock <= 5 ? "text-amber-500" : "text-green-600"}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => updateProduct.mutate({ id: p.id, isActive: !p.isActive })}
                      className={p.isActive ? "text-green-500" : "text-surface-300"}
                    >
                      {p.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-surface-400 hover:text-brand-600">
                      <Pencil size={14} />
                    </button>
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
