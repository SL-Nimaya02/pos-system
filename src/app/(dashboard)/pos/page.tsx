import { CartProvider } from "@/components/pos/cart-context";
import { ProductGrid } from "@/components/pos/product-grid";
import { CartPanel } from "@/components/pos/cart-panel";
import { Bell, UserCircle } from "lucide-react";

export default function POSPage() {
  return (
    <CartProvider>
      <div className="flex h-screen bg-surface-50">
        {/* Left: Products */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-surface-100 shadow-sm z-10">
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Pos System</h1>
            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                {/* Search is moved to product-grid in this implementation, but we can put a global one here if needed, or leave it in product-grid as per current code. Let's keep it in product grid for now, but add placeholder icons here */}
              </div>
              <button className="p-2 text-surface-400 hover:text-brand-600 transition-colors">
                <Bell size={20} />
              </button>
              <button className="p-2 text-surface-400 hover:text-brand-600 transition-colors">
                <UserCircle size={24} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <ProductGrid />
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-[380px] bg-white border-l border-surface-200 flex flex-col overflow-hidden shadow-xl z-20">
          <CartPanel />
        </div>
      </div>
    </CartProvider>
  );
}
