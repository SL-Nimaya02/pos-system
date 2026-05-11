"use client";

import { useState } from "react";
import { useCart } from "./cart-context";
import { trpc } from "@/lib/trpc";
import { Trash2, Minus, Plus, ShoppingCart, Printer, X } from "lucide-react";
import toast from "react-hot-toast";

type PaymentMethod = "cash" | "card" | "stripe_terminal";

interface ReceiptData {
  orderNumber: string;
  items: { name: string; qty: number; price: number; subtotal: number }[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  changeDue?: number;
  time: string;
}

function ReceiptModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h2 className="font-bold text-surface-900">Receipt</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600">
            <X size={18} />
          </button>
        </div>

        {/* Receipt body — printable */}
        <div id="receipt-print" className="p-5 font-mono text-xs">
          <div className="text-center mb-4">
            <p className="font-bold text-base text-surface-900">POS System</p>
            <p className="text-surface-400 mt-0.5">{receipt.time}</p>
            <p className="text-surface-500 mt-0.5">Order: {receipt.orderNumber}</p>
          </div>

          <div className="border-t border-dashed border-surface-300 my-3" />

          <div className="space-y-1.5">
            {receipt.items.map((item, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="text-surface-700 truncate">{item.name} x{item.qty}</span>
                <span className="text-surface-800 shrink-0">LKR {item.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-surface-300 my-3" />

          <div className="space-y-1">
            <div className="flex justify-between text-surface-600">
              <span>Subtotal</span><span>LKR {receipt.subtotal.toFixed(2)}</span>
            </div>
            {receipt.taxAmount > 0 && (
              <div className="flex justify-between text-surface-600">
                <span>Tax</span><span>LKR {receipt.taxAmount.toFixed(2)}</span>
              </div>
            )}
            {receipt.discount > 0 && (
              <div className="flex justify-between text-surface-600">
                <span>Discount</span><span>-LKR {receipt.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-surface-900 text-sm pt-1 border-t border-surface-200 mt-1">
              <span>TOTAL</span><span>LKR {receipt.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-surface-300 my-3" />

          <div className="space-y-1 text-surface-600">
            <div className="flex justify-between">
              <span>Payment</span>
              <span className="capitalize">{receipt.paymentMethod}</span>
            </div>
            {receipt.cashReceived != null && (
              <>
                <div className="flex justify-between">
                  <span>Cash Received</span><span>LKR {receipt.cashReceived.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-brand-700">
                  <span>Change Due</span><span>LKR {(receipt.changeDue ?? 0).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <div className="border-t border-dashed border-surface-300 my-3" />
          <p className="text-center text-surface-400">Thank you for your purchase!</p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={() => {
              const el = document.getElementById("receipt-print");
              if (!el) return;
              const win = window.open("", "_blank");
              if (!win) return;
              win.document.write(`
                <html><head><title>Receipt</title>
                <style>body{font-family:monospace;font-size:12px;max-width:300px;margin:auto;padding:16px}</style>
                </head><body>${el.innerHTML}</body></html>
              `);
              win.document.close();
              win.print();
            }}
            className="flex-1 flex items-center justify-center gap-2 btn-primary py-3"
          >
            <Printer size={16} /> Print Receipt
          </button>
          <button onClick={onClose} className="flex-1 btn-secondary py-3">Close</button>
        </div>
      </div>
    </div>
  );
}

export function CartPanel() {
  const { state, subtotal, taxAmount, total, removeItem, updateQty, setDiscount, clear } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [discountInput, setDiscountInput] = useState("0");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const createOrder = trpc.orders.create.useMutation({
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
      const order = await createOrder.mutateAsync({
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

      // Build receipt data before clearing cart
      setReceipt({
        orderNumber: order.orderNumber,
        items: state.items.map((i) => ({ name: i.productName, qty: i.quantity, price: i.productPrice, subtotal: i.subtotal })),
        subtotal,
        taxAmount,
        discount: state.discount,
        total,
        paymentMethod,
        cashReceived: cashReceived ? parseFloat(cashReceived) : undefined,
        changeDue: changeDue ?? undefined,
        time: new Date().toLocaleString(),
      });

      clear();
      setCashReceived("");
      setDiscountInput("0");
      toast.success(`Order ${order.orderNumber} completed!`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}

      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-100">
          <div className="flex items-center gap-2">
            <div className="relative">
              <ShoppingCart size={20} className="text-surface-800" />
              {state.items.length > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-bounce">
                  {state.items.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </div>
            <span className="font-bold text-lg text-surface-900 tracking-tight">Order Details</span>
          </div>
          {state.items.length > 0 && (
            <button onClick={clear} className="text-sm font-medium text-brand-600 hover:text-brand-700">
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
              <div key={item.productId} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-surface-100 shadow-sm">
                <div className="w-12 h-12 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-2xl">🛒</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-surface-900 truncate">{item.productName}</p>
                    <button onClick={() => removeItem(item.productId)} className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm font-bold text-brand-700">LKR {item.productPrice.toFixed(2)}</p>
                    <div className="flex items-center gap-2 bg-surface-50 rounded-lg p-1">
                      <button onClick={() => updateQty(item.productId, item.quantity - 1)}
                        className="w-6 h-6 rounded-md bg-white text-surface-600 hover:text-brand-600 shadow-sm flex items-center justify-center transition-colors">
                        <Minus size={12} strokeWidth={3} />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-surface-800">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.maxStock}
                        className="w-6 h-6 rounded-md bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-40 shadow-sm flex items-center justify-center transition-colors">
                        <Plus size={12} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                  {item.quantity >= item.maxStock && (
                    <p className="text-[10px] text-amber-500 font-medium mt-1">Max stock reached</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary + Checkout */}
        <div className="p-6 bg-surface-50 space-y-5 border-t border-surface-100">
          <div className="bg-brand-50/50 p-4 rounded-xl border border-brand-100 space-y-3">
            <div className="flex justify-between text-surface-600 text-sm font-medium">
              <span>Subtotal :</span><span>LKR {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-surface-600 text-sm font-medium">
              <span>Tax :</span><span>LKR {taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-surface-600 text-sm font-medium">
              <span>Discount :</span>
              <input type="number" min={0} value={discountInput}
                onChange={(e) => { setDiscountInput(e.target.value); setDiscount(parseFloat(e.target.value) || 0); }}
                className="w-20 text-right bg-white border border-surface-200 rounded px-2 py-1 text-xs" />
            </div>
            <div className="flex justify-between font-bold text-lg text-surface-900 pt-3 border-t border-brand-200/60 border-dashed mt-2">
              <span>Total Amount :</span><span>LKR {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(["cash", "card"] as PaymentMethod[]).map((m) => (
              <button key={m} onClick={() => setPaymentMethod(m)}
                className={`py-3 flex items-center justify-center gap-2 text-sm font-bold rounded-xl transition-all border ${
                  paymentMethod === m ? "bg-white text-brand-700 border-brand-600 shadow-sm" : "bg-white text-surface-500 border-surface-200 hover:border-brand-300"
                }`}>
                <span className="text-lg">{m === "cash" ? "💵" : "💳"}</span>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {paymentMethod === "cash" && (
            <div className="space-y-1">
              <input type="number" placeholder="Cash received (LKR)" value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="input w-full rounded-xl py-3 text-sm border-surface-200" />
              {changeDue != null && changeDue >= 0 && (
                <p className="text-xs text-brand-600 font-semibold px-1">Change due: LKR {changeDue.toFixed(2)}</p>
              )}
              {changeDue != null && changeDue < 0 && (
                <p className="text-xs text-red-500 px-1">Insufficient amount</p>
              )}
            </div>
          )}

          <button onClick={handleCheckout} disabled={state.items.length === 0 || isProcessing}
            className="w-full bg-brand-700 hover:bg-brand-800 text-white rounded-xl py-4 text-base font-bold transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100">
            {isProcessing ? "Processing..." : "Proceed Payment"}
          </button>
        </div>
      </div>
    </>
  );
}
