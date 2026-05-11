"use client";

import { useState } from "react";
import { useCart } from "./cart-context";
import { trpc } from "@/lib/trpc";
import { Trash2, Minus, Plus, ShoppingCart, X } from "lucide-react";
import toast from "react-hot-toast";

type PaymentMethod = "cash" | "card" | "stripe_terminal";

export function CartPanel() {
  const { state, subtotal, taxAmount, total, removeItem, updateQty, setDiscount, clear } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountInput, setDiscountInput] = useState("0");

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: (order) => {
      toast.success(`Order ${order.orderNumber} completed!`);
      clear();
      setCashReceived("");
      setDiscountInput("0");
    },
    onError: (err) => toast.error(err.message),
  });

  const changeDue =
    paymentMethod === "cash" && cashReceived
      ? parseFloat(cashReceived) - total
      : null;

  const handleCheckout = async () => {
    if (state.items.length === 0) return toast.error("Cart is empty");
    if (paymentMethod === "cash") {
      const cash = parseFloat(cashReceived);
      if (!cash || cash < total) return toast.error("Insufficient cash amount");
    }

    setIsProcessing(true);
    try {
      await createOrder.mutateAsync({
        items: state.items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          productPrice: i.productPrice.toFixed(2),
          quantity: i.quantity,
          subtotal: i.subtotal.toFixed(2),
        })),
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        discountAmount: state.discount.toFixed(2),
        total: total.toFixed(2),
        paymentMethod,
        cashReceived: cashReceived || undefined,
        changeDue: changeDue != null ? changeDue.toFixed(2) : undefined,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-surface-100">
        <div className="flex items-center gap-2">
          <ShoppingCart size={20} className="text-surface-800" />
          <span className="font-bold text-lg text-surface-900 tracking-tight">Order Details</span>
        </div>
        {state.items.length > 0 && (
          <button
            onClick={clear}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {state.items.length === 0 ? (
          <div className="text-center py-16 text-surface-400">
            <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm font-medium">Your cart is empty</p>
          </div>
        ) : (
          state.items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-3 p-3 bg-white rounded-xl border border-surface-100 shadow-sm"
            >
              <div className="w-12 h-12 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-2xl">🍔</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-bold text-surface-900 truncate">
                    {item.productName}
                  </p>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-bold text-brand-700">
                    LKR {item.productPrice.toFixed(2)}
                  </p>
                  <div className="flex items-center gap-2 bg-surface-50 rounded-lg p-1">
                    <button
                      onClick={() => updateQty(item.productId, item.quantity - 1)}
                      className="w-6 h-6 rounded-md bg-white text-surface-600 hover:text-brand-600 shadow-sm flex items-center justify-center transition-colors"
                    >
                      <Minus size={12} strokeWidth={3} />
                    </button>
                    <span className="w-4 text-center text-xs font-bold text-surface-800">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.quantity + 1)}
                      className="w-6 h-6 rounded-md bg-brand-700 text-white hover:bg-brand-800 shadow-sm flex items-center justify-center transition-colors"
                    >
                      <Plus size={12} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary + Checkout */}
      <div className="p-6 bg-surface-50 space-y-5 border-t border-surface-100">
        
        {/* Totals */}
        <div className="bg-brand-50/50 p-4 rounded-xl border border-brand-100 space-y-3">
          <div className="flex justify-between text-surface-600 text-sm font-medium">
            <span>Subtotal :</span>
            <span>LKR {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-surface-600 text-sm font-medium">
            <span>Tax :</span>
            <span>LKR {taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-surface-600 text-sm font-medium">
            <span>Discount :</span>
            <input
              type="number"
              min={0}
              value={discountInput}
              onChange={(e) => {
                setDiscountInput(e.target.value);
                setDiscount(parseFloat(e.target.value) || 0);
              }}
              className="w-20 text-right bg-white border border-surface-200 rounded px-2 py-1 text-xs"
            />
          </div>
          <div className="flex justify-between font-bold text-lg text-surface-900 pt-3 border-t border-brand-200/60 border-dashed mt-2">
            <span>Total Amount :</span>
            <span>LKR {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPaymentMethod("cash")}
            className={`py-3 flex items-center justify-center gap-2 text-sm font-bold rounded-xl transition-all border ${
              paymentMethod === "cash"
                ? "bg-white text-brand-700 border-brand-600 shadow-sm"
                : "bg-white text-surface-500 border-surface-200 hover:border-brand-300"
            }`}
          >
            <span className="text-lg">💵</span> Cash
          </button>
          <button
            onClick={() => setPaymentMethod("card")}
            className={`py-3 flex items-center justify-center gap-2 text-sm font-bold rounded-xl transition-all border ${
              paymentMethod === "card"
                ? "bg-white text-brand-700 border-brand-600 shadow-sm"
                : "bg-white text-surface-500 border-surface-200 hover:border-brand-300"
            }`}
          >
            <span className="text-lg">💳</span> Card
          </button>
        </div>

        {/* Cash received input when cash selected */}
        {paymentMethod === "cash" && (
          <div className="space-y-1">
            <input
              type="number"
              placeholder="Cash received (LKR)"
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              className="input w-full rounded-xl py-3 text-sm border-surface-200"
            />
            {changeDue != null && changeDue >= 0 && (
              <p className="text-xs text-brand-600 font-semibold px-1">
                Change due: LKR {changeDue.toFixed(2)}
              </p>
            )}
            {changeDue != null && changeDue < 0 && (
              <p className="text-xs text-red-500 px-1">Insufficient amount</p>
            )}
          </div>
        )}

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          disabled={state.items.length === 0 || isProcessing}
          className="w-full bg-brand-700 hover:bg-brand-800 text-white rounded-xl py-4 text-base font-bold transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          {isProcessing ? "Processing..." : "Proceed Payment"}
        </button>
      </div>
    </div>
  );
}
