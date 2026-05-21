"use client";

import { useState, useEffect } from "react";

interface CartItem {
  productId:   string;
  productName: string;
  productPrice: number;
  quantity:    number;
  subtotal:    number;
  taxRate:     number;
}

interface CartState {
  items:    CartItem[];
  discount: number;
}

export default function CustomerDisplayPage() {
  const [cart, setCart] = useState<CartState>({ items: [], discount: 0 });
  const [storeName, setStoreName] = useState("POS System");

  useEffect(() => {
    const loadCart = () => {
      try {
        const raw = localStorage.getItem("pos_cart");
        if (raw) setCart(JSON.parse(raw) as CartState);
      } catch {}
      try {
        const settings = localStorage.getItem("pos_settings");
        if (settings) {
          const parsed = JSON.parse(settings) as { storeName?: string };
          if (parsed.storeName) setStoreName(parsed.storeName);
        }
      } catch {}
    };

    loadCart();
    const handler = (e: StorageEvent) => {
      if (e.key === "pos_cart" || e.key === "pos_settings") loadCart();
    };
    window.addEventListener("storage", handler);
    // Also poll every 2s as fallback (same-tab localStorage changes don't fire 'storage')
    const interval = setInterval(loadCart, 2000);
    return () => { window.removeEventListener("storage", handler); clearInterval(interval); };
  }, []);

  const subtotal = cart.items.reduce((s, i) => s + i.subtotal, 0);
  const taxAmount = cart.items.reduce((s, i) => s + (i.subtotal * (i.taxRate ?? 0)) / 100, 0);
  const discount = cart.discount;
  const total = subtotal - discount + taxAmount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-10 py-5 border-b border-white/20 bg-brand-900/60">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-2xl font-black">POS</span>
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">{storeName}</h1>
            <p className="text-brand-200 text-sm">Customer Display</p>
          </div>
        </div>
        <p className="text-brand-200 text-base">{new Date().toLocaleString()}</p>
      </div>

      {/* Cart */}
      <div className="flex-1 flex flex-col items-center justify-center px-10 py-8">
        {cart.items.length === 0 ? (
          <div className="text-center text-white/50">
            <p className="text-6xl mb-4">🛒</p>
            <p className="text-2xl font-semibold">Waiting for items...</p>
          </div>
        ) : (
          <div className="w-full max-w-3xl">
            <table className="w-full text-base mb-6">
              <thead>
                <tr className="border-b border-white/20 text-white/70 text-sm uppercase tracking-wider">
                  <th className="text-left pb-3">Item</th>
                  <th className="text-center pb-3">Qty</th>
                  <th className="text-right pb-3">Unit Price</th>
                  <th className="text-right pb-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((item) => (
                  <tr key={item.productId} className="border-b border-white/10">
                    <td className="py-3 font-semibold">{item.productName}</td>
                    <td className="py-3 text-center text-white/80">{item.quantity}</td>
                    <td className="py-3 text-right text-white/80">Rs.{item.productPrice.toFixed(2)}</td>
                    <td className="py-3 text-right font-bold">Rs.{item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="rounded-2xl bg-white/10 border border-white/20 p-6 space-y-2 text-base">
              <div className="flex justify-between text-white/80">
                <span>Subtotal</span>
                <span>Rs.{subtotal.toFixed(2)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-white/80">
                  <span>Tax</span>
                  <span>Rs.{taxAmount.toFixed(2)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-red-300">
                  <span>Discount</span>
                  <span>-Rs.{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-3xl font-black border-t border-white/30 pt-4 mt-2">
                <span>TOTAL</span>
                <span>Rs.{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-10 py-4 text-center text-brand-200 text-sm border-t border-white/20 bg-brand-900/40">
        Thank you for shopping with us!
      </div>
    </div>
  );
}
