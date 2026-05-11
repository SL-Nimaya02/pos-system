"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useCart } from "./cart-context";
import { Search, Plus } from "lucide-react";
import toast from "react-hot-toast";

export function ProductGrid() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();

  const { data: products, isLoading } = trpc.products.list.useQuery({
    search: search || undefined,
    categoryId,
    activeOnly: true,
  });
  const { data: categories } = trpc.categories.list.useQuery();

  const { addItem } = useCart();

  const handleAdd = (product: { id: string; name: string; price: string; stock: number }) => {
    if (product.stock <= 0) {
      toast.error("Out of stock");
      return;
    }
    addItem({ id: product.id, name: product.name, price: product.price });
    toast.success(`${product.name} added`, { duration: 1000 });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search & Filter */}
      <div className="p-6 space-y-4 bg-surface-50">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-600" />
          <input
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-surface-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-sm"
            placeholder="Search Products or Scan Bar code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* Category tabs */}
        {categories && categories.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide pt-2">
            <button
              onClick={() => setCategoryId(undefined)}
              className={`shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all border ${
                !categoryId
                  ? "bg-white text-brand-700 border-brand-200 shadow-sm"
                  : "bg-transparent text-surface-500 border-transparent hover:bg-white hover:shadow-sm"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id)}
                className={`shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all border ${
                  categoryId === cat.id
                    ? "bg-white text-brand-700 border-brand-200 shadow-sm"
                    : "bg-transparent text-surface-500 border-transparent hover:bg-white hover:shadow-sm"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-surface-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : products?.length === 0 ? (
          <div className="text-center py-16 text-surface-400">
            <Package size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {products?.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl p-3 border border-surface-100 hover:border-brand-200 hover:shadow-lg transition-all group flex flex-col"
              >
                {/* Image Placeholder */}
                <div className="w-full h-32 bg-brand-50 rounded-xl mb-3 relative overflow-hidden flex items-center justify-center">
                   {product.stock <= 0 && (
                    <span className="absolute top-2 right-2 text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-lg z-10">
                      Out of stock
                    </span>
                  )}
                  {/* We would render an actual img here if product.imageUrl exists */}
                  <span className="text-4xl">🍔</span>
                </div>
                
                <div className="flex-1 flex flex-col">
                  <h3 className="text-sm font-bold text-surface-900 leading-tight mb-1">
                    {product.name}
                  </h3>
                  <p className="text-[11px] text-surface-400 line-clamp-2 leading-relaxed mb-3">
                    Plant Patty, lettuce, tomato, sauce
                  </p>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <p className="text-sm font-bold text-brand-700">
                      LKR {parseFloat(product.price).toFixed(2)}
                    </p>
                    <button
                      onClick={() =>
                        handleAdd({
                          id: product.id,
                          name: product.name,
                          price: product.price,
                          stock: product.stock,
                        })
                      }
                      disabled={product.stock <= 0}
                      className="w-8 h-8 bg-brand-700 hover:bg-brand-800 disabled:bg-surface-200 text-white rounded-full flex items-center justify-center transition-colors active:scale-95 shadow-sm"
                    >
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Package(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size ?? 24}
      height={props.size ?? 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  );
}
