"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Box, Search } from "lucide-react";
import toast from "react-hot-toast";

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();

  const { data: products, isLoading } = trpc.products.list.useQuery({ activeOnly: false });
  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => { utils.products.list.invalidate(); toast.success("Stock updated!"); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = products?.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const stockBadge = (stock: number) => {
    if (stock === 0) return "bg-red-100 text-red-600";
    if (stock <= 5) return "bg-amber-100 text-amber-600";
    return "bg-green-100 text-green-700";
  };
  const stockLabel = (stock: number) => {
    if (stock === 0) return "Out of Stock";
    if (stock <= 5) return "Low Stock";
    return "In Stock";
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <Box size={24} className="text-brand-600" /> Inventory
          </h1>
          <p className="text-sm text-surface-400 mt-1">{filtered.length} products</p>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
        <input
          className="input pl-9"
          placeholder="Search product or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-surface-400 text-sm">Loading inventory...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Category</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Price</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Stock</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-surface-800">{p.name}</p>
                    {p.sku && <p className="text-xs text-surface-400">SKU: {p.sku}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-surface-500">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-brand-600">
                    LKR {parseFloat(p.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-surface-800">{p.stock}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${stockBadge(p.stock)}`}>
                      {stockLabel(p.stock)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => updateProduct.mutate({ id: p.id, stock: Math.max(0, p.stock - 1) })}
                        className="w-7 h-7 rounded-lg bg-surface-100 hover:bg-red-100 hover:text-red-600 text-surface-600 flex items-center justify-center font-bold text-lg transition-colors"
                      >−</button>
                      <button
                        onClick={() => updateProduct.mutate({ id: p.id, stock: p.stock + 1 })}
                        className="w-7 h-7 rounded-lg bg-surface-100 hover:bg-green-100 hover:text-green-600 text-surface-600 flex items-center justify-center font-bold text-lg transition-colors"
                      >+</button>
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
