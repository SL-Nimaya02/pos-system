"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useCart } from "./cart-context";
import type { CartItem } from "./cart-context";
import { trpc } from "@/lib/trpc";
import { Search, X, Plus, Minus, Camera, ScanLine, MessageCircle, Mail, Printer } from "lucide-react";
import { useRole } from "@/contexts/role-context";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import toast from "react-hot-toast";
import { printReceipt, type ReceiptData } from "@/lib/receipt-printer";
import { useLanguage } from "@/contexts/language-context";
import { useRouter } from "next/navigation";

type PaymentMethod = "cash" | "card" | "credit_card" | "debit_card" | "cheque" | "account_credit";

type POSProduct = {
  id: string; name: string; price: string; stock: number; taxRate: string | null; warrantyInfo?: string | null; imageUrl?: string | null;
  variants: { id: string; name: string; value: string; priceDiff: string; stock: number; sku: string | null; barcode: string | null }[];
};

interface HeldOrder {
  id: string;
  timestamp: number;
  customerName: string;
  route: string;
  discount: number;
  items: CartItem[];
}

// Toggle
function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer select-none">
      <div className="relative">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className="w-9 h-5 bg-surface-300 rounded-full peer peer-checked:bg-brand-600 transition-colors" />
        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
      </div>
      <div className="leading-tight">
        <span className="text-sm font-semibold text-surface-800 block">{label}</span>
        <span className="text-xs text-surface-500">{hint}</span>
      </div>
    </label>
  );
}

// Action button
function Btn({ label, hint, color, onClick }: { label: string; hint?: string; color: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ backgroundColor: color }}
      className="flex flex-col items-center justify-center rounded text-white text-xs font-bold leading-tight px-1 py-2.5 gap-0.5 hover:opacity-90 active:opacity-75 transition-opacity"
    >
      {hint && <span className="text-[11px] font-normal text-white/70">{hint}</span>}
      <span>{label}</span>
    </button>
  );
}

export function POSTerminal() {
  const { state, subtotal, taxAmount, total, addItem, removeItem, updateQty, setDiscount, clear } = useCart();
  const { userName, role } = useRole();
  const { t } = useLanguage();
  const router = useRouter();

  const [allDiscount, setAllDiscount] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [customer, setCustomer] = useState("");
  const [savedCustomers, setSavedCustomers] = useState<string[]>([]);
  // Customer phone lookup for checkout
  const [custPhoneInput, setCustPhoneInput] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [saveNewCustomer, setSaveNewCustomer] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pos_customers");
      if (raw) setSavedCustomers(JSON.parse(raw) as string[]);
    } catch {}
  }, []);
  const [route, setRoute] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [showScanner, setShowScanner] = useState(false);
  const [scanInput, setScanInput] = useState("");

  const [defaultPrintSize, setDefaultPrintSize] = useState<"80mm" | "a4">("80mm");
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(false);
  const [enableLoyalty, setEnableLoyalty] = useState(true);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pos_settings");
      if (raw) {
        const s = JSON.parse(raw) as { defaultPrintSize?: "80mm" | "a4", autoPrintReceipt?: boolean, defaultPaymentMethod?: PaymentMethod, enableLoyalty?: boolean };
        if (s.defaultPrintSize) setDefaultPrintSize(s.defaultPrintSize);
        if (s.autoPrintReceipt) setAutoPrintReceipt(s.autoPrintReceipt);
        if (s.defaultPaymentMethod) setPaymentMethod(s.defaultPaymentMethod);
        if (s.enableLoyalty !== undefined) setEnableLoyalty(s.enableLoyalty);
      }
    } catch {}
  }, []);

  // Held orders
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [showHeld, setShowHeld] = useState(false);

  // Custom item modal
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [isFreeItem, setIsFreeItem] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");

  // Share receipt modal
  const [shareModal, setShareModal] = useState<{
    receiptData: ReceiptData;
    phone: string;
    email: string;
    printSize: "80mm" | "a4";
  } | null>(null);
  const [sharePhone, setSharePhone] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  // Look up customer record (has email) when modal is open with a phone number
  const [shareModalPhone, setShareModalPhone] = useState("");
  const customerByPhone = trpc.customers.getByPhone.useQuery(
    { phone: shareModalPhone },
    { enabled: !!shareModalPhone }
  );
  // Checkout customer lookup
  const checkoutCustomer = trpc.customers.getByPhone.useQuery(
    { phone: custPhone },
    { enabled: !!custPhone }
  );
  const createCustomer = trpc.customers.create.useMutation();

  // Variant picker modal
  const [variantPickerProduct, setVariantPickerProduct] = useState<POSProduct | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pos_held_orders");
      if (raw) setHeldOrders(JSON.parse(raw) as HeldOrder[]);
    } catch {}
  }, []);

  const { data: products, isLoading: productsLoading } = trpc.products.list.useQuery({ search: search || undefined, categoryId, activeOnly: true });
  const { data: categories } = trpc.categories.list.useQuery();
  const createOrder = trpc.orders.create.useMutation({ onError: (err) => toast.error(err.message) });

  // Promo code
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const promoResult = trpc.orders.validatePromo.useQuery(
    { code: promoApplied.toUpperCase(), orderAmount: subtotal.toFixed(2) },
    { enabled: !!promoApplied }
  );
  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    setPromoApplied(promoCode.trim());
  };
  useEffect(() => {
    if (promoResult.data?.valid) {
      setPromoDiscount(parseFloat(promoResult.data.discount));
      toast.success("Promo code applied!");
    } else if (promoResult.data && !promoResult.data.valid) {
      setPromoDiscount(0);
      toast.error(promoResult.data.reason);
    }
  }, [promoResult.data]);

  // Loyalty
  const [loyaltyPhone, setLoyaltyPhone] = useState("");
  const [loyaltyPhoneInput, setLoyaltyPhoneInput] = useState("");
  const [redeemPoints, setRedeemPoints] = useState(0);
  const loyaltyResult = trpc.loyalty.lookup.useQuery(
    { phone: loyaltyPhone },
    { enabled: !!loyaltyPhone }
  );
  const handleLoyaltyLookup = () => setLoyaltyPhone(loyaltyPhoneInput.trim());

  // Auto-fill email in share modal when customer record is found by phone
  useEffect(() => {
    if (customerByPhone.data?.email) {
      setShareEmail(customerByPhone.data.email);
    }
  }, [customerByPhone.data]);

  // Auto-fill customer name when checkout customer is found
  useEffect(() => {
    if (checkoutCustomer.data) {
      setCustomer(checkoutCustomer.data.name);
      setSaveNewCustomer(false);
    }
  }, [checkoutCustomer.data]);

  // Active cash register session
  const { data: activeSession } = trpc.cashRegister.getActive.useQuery(undefined, { retry: false });

  const [cardFeeEnabled, setCardFeeEnabled] = useState(true);

  const isCardPayment = paymentMethod === "card" || paymentMethod === "credit_card" || paymentMethod === "debit_card";
  const cardFee = isCardPayment && cardFeeEnabled ? total * 0.03 : 0;
  const finalTotal = total + cardFee - promoDiscount;
  const balance = paymentMethod === "cash" && cashAmount ? parseFloat(cashAmount) - finalTotal : 0;

  // Credit account derived values (safe even when loyalty not found)
  const creditLimit     = parseFloat((loyaltyResult.data as any)?.creditLimit    ?? "0");
  const creditBalance   = parseFloat((loyaltyResult.data as any)?.creditBalance  ?? "0");
  const availableCredit = creditLimit - creditBalance;

  const handleAdd = useCallback(
    (product: POSProduct) => {
      // If product has variants, show the variant picker
      if (product.variants.length > 0) {
        setVariantPickerProduct(product);
        return;
      }
      if (product.stock <= 0) return toast.error("Out of stock");
      const existing = state.items.find((i) => i.productId === product.id);
      if (existing && existing.quantity >= product.stock) return toast.error(`Only ${product.stock} in stock`);
      addItem({ id: product.id, name: product.name, price: product.price, taxRate: parseFloat(product.taxRate ?? "0"), maxStock: product.stock, warrantyInfo: product.warrantyInfo || undefined, imageUrl: product.imageUrl || null });
    },
    [addItem, state.items]
  );

  const handleAddVariant = useCallback(
    (product: POSProduct, variant: POSProduct["variants"][number]) => {
      if (variant.stock <= 0) return toast.error("Out of stock");
      const variantName = `${product.name} (${variant.name}: ${variant.value})`;
      const variantPrice = (parseFloat(product.price) + parseFloat(variant.priceDiff)).toFixed(2);
      // Use variant id as cart item key so same product with diff variant = different line
      const cartId = `${product.id}__v__${variant.id}`;
      const existing = state.items.find((i) => i.productId === cartId);
      if (existing && existing.quantity >= variant.stock) return toast.error(`Only ${variant.stock} in stock`);
      addItem({ id: cartId, name: variantName, price: variantPrice, taxRate: parseFloat(product.taxRate ?? "0"), maxStock: variant.stock, warrantyInfo: product.warrantyInfo || undefined, imageUrl: product.imageUrl || null });
      setVariantPickerProduct(null);
    },
    [addItem, state.items]
  );

  const findByBarcode = useCallback(
    (barcode: string): { product: POSProduct; variant: POSProduct["variants"][number] | null } | null => {
      if (!products) return null;
      // First check variant barcodes and SKUs
      for (const p of products) {
        const matchingVariant = p.variants.find(
          (v) => v.barcode === barcode || v.sku === barcode
        );
        if (matchingVariant) return { product: p, variant: matchingVariant };
      }
      // Then check product-level SKU and generated barcode
      const p = products.find(
        (p) => p.sku === barcode || `P${p.id.slice(-10).toUpperCase()}` === barcode
      );
      return p ? { product: p, variant: null } : null;
    },
    [products]
  );

  useBarcodeScanner(
    useCallback(
      (barcode: string) => {
        const result = findByBarcode(barcode);
        if (!result) return toast.error(`Barcode not found: ${barcode}`);
        if (result.variant) {
          handleAddVariant(result.product, result.variant);
        } else {
          handleAdd(result.product);
        }
      },
      [findByBarcode, handleAdd, handleAddVariant]
    )
  );

  const handleSimulateScan = useCallback(
    (barcode: string) => {
      const trimmed = barcode.trim();
      if (!trimmed) return;
      const result = findByBarcode(trimmed);
      if (!result) {
        toast.error(`Barcode not found: ${trimmed}`);
        return;
      }
      if (result.variant) {
        handleAddVariant(result.product, result.variant);
        toast.success(`Scanned: ${result.product.name} (${result.variant.name}: ${result.variant.value})`);
      } else {
        handleAdd(result.product);
        toast.success(`Scanned: ${result.product.name}`);
      }
      setScanInput("");
      setShowScanner(false);
    },
    [findByBarcode, handleAdd, handleAddVariant]
  );

  // printSize is optional — when omitted, receipt-printer reads the stored default from localStorage
  const handlePay = async (shouldPrint: boolean = false, printSize?: "80mm" | "a4") => {
    const finalShouldPrint = shouldPrint || autoPrintReceipt;
    if (state.items.length === 0) return toast.error("Cart is empty");
    if (paymentMethod === "cash") {
      const cash = parseFloat(cashAmount);
      if (!cash || cash < finalTotal) return toast.error("Insufficient cash amount");
    }
    if (paymentMethod === "account_credit") {
      if (!loyaltyResult.data) return toast.error("No loyalty account linked");
      if (creditLimit <= 0) return toast.error("This account has no credit facility");
      if (availableCredit < finalTotal)
        return toast.error(`Insufficient credit — available: Rs.${availableCredit.toFixed(2)}`);
    }
    setIsProcessing(true);
    try {
      // ── Stripe: create payment intent for card payments ─────────────────
      let stripePaymentIntentId: string | undefined;
      if (isCardPayment && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        const res = await fetch("/api/stripe/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: finalTotal }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Stripe payment failed");
        }
        const { intentId } = await res.json() as { clientSecret: string; intentId: string };
        stripePaymentIntentId = intentId;
      }

      const order = await createOrder.mutateAsync({
        items: state.items.map((i) => ({ productId: i.productId, productName: i.productName, productPrice: i.productPrice.toFixed(2), quantity: i.quantity, subtotal: i.subtotal.toFixed(2), warrantyInfo: i.warrantyInfo })),
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        discountAmount: (state.discount + promoDiscount).toFixed(2),
        total: finalTotal.toFixed(2),
        paymentMethod: isCardPayment && stripePaymentIntentId ? "stripe_terminal" : paymentMethod,
        cashReceived: cashAmount || undefined,
        changeDue: balance > 0 ? balance.toFixed(2) : undefined,
        promoCode: promoApplied || undefined,
        loyaltyPhone: loyaltyPhone || undefined,
        loyaltyPointsRedeemed: redeemPoints > 0 ? redeemPoints : undefined,
        sessionId: activeSession?.id ?? undefined,
        stripePaymentIntentId,
        creditAccountId:
          paymentMethod === "account_credit" ? (loyaltyResult.data as any)?.id : undefined,
      });

      const paid = paymentMethod === "cash" && cashAmount ? parseFloat(cashAmount) : finalTotal;
      const receiptData: ReceiptData = {
        orderNumber: order.orderNumber,
        date: new Date(),
        cashierName: userName || "Cashier",
        customerName: customer || t.pos.walkIn,
        customerPhone: custPhone || loyaltyPhone || undefined,
        paymentMethod,
        items: state.items.map((i) => ({
          name: i.productName,
          quantity: i.quantity,
          price: i.productPrice,
          discount: 0,
          amount: i.subtotal,
          warrantyInfo: i.warrantyInfo,
        })),
        itemDiscount: 0,
        billDiscount: state.discount,
        cardFee: cardFee > 0 ? cardFee : undefined,
        billAmount: finalTotal,
        paidAmount: paid,
        balanceAmount: Math.max(0, paid - finalTotal),
      };

      // Show share modal (user prints/sends from there)
      const prePhone = custPhone || loyaltyPhone || "";
      // Save new customer if not found and checkbox checked
      if (saveNewCustomer && custPhone && customer.trim() && !checkoutCustomer.data) {
        createCustomer.mutate({ name: customer.trim(), phone: custPhone });
      }
      const preEmail = checkoutCustomer.data?.email || "";
      setSharePhone(prePhone);
      setShareEmail(preEmail);
      setShareModalPhone(prePhone);
      setShareModal({ receiptData, phone: prePhone, email: preEmail, printSize: printSize ?? defaultPrintSize });

      clear();
      setCashAmount("");
      setPromoCode("");
      setPromoApplied("");
      setPromoDiscount(0);
      setLoyaltyPhone("");
      setLoyaltyPhoneInput("");
      setRedeemPoints(0);
      setCustPhone("");
      setCustPhoneInput("");
      setSaveNewCustomer(false);
      // Save customer name for future use
      const name = customer.trim();
      if (name && !savedCustomers.includes(name)) {
        const updated = [name, ...savedCustomers].slice(0, 50);
        setSavedCustomers(updated);
        localStorage.setItem("pos_customers", JSON.stringify(updated));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHold = () => {
    if (state.items.length === 0) return toast.error("Cart is empty");
    const held: HeldOrder = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      customerName: customer || t.pos.walkIn,
      route,
      discount: state.discount,
      items: [...state.items],
    };
    const updated = [held, ...heldOrders].slice(0, 20);
    setHeldOrders(updated);
    localStorage.setItem("pos_held_orders", JSON.stringify(updated));
    clear();
    setCashAmount("");
    setCustomer("");
    setRoute("");
    toast.success("Order held");
  };

  const handleRecall = (held: HeldOrder) => {
    if (state.items.length > 0 && !confirm("Replace current cart with held order?")) return;
    clear();
    held.items.forEach((item) => {
      addItem({ id: item.productId, name: item.productName, price: String(item.productPrice), taxRate: item.taxRate, maxStock: item.maxStock });
      if (item.quantity > 1) updateQty(item.productId, item.quantity);
    });
    setDiscount(held.discount);
    setCustomer(held.customerName);
    setRoute(held.route);
    const updated = heldOrders.filter((h) => h.id !== held.id);
    setHeldOrders(updated);
    localStorage.setItem("pos_held_orders", JSON.stringify(updated));
    setShowHeld(false);
  };

  const handleDeleteHeld = (id: string) => {
    const updated = heldOrders.filter((h) => h.id !== id);
    setHeldOrders(updated);
    localStorage.setItem("pos_held_orders", JSON.stringify(updated));
  };

  const handleAddCustomItem = () => {
    if (!customItemName.trim()) return toast.error("Enter item name");
    const price = isFreeItem ? 0 : parseFloat(customItemPrice) || 0;
    addItem({ id: `custom-${Date.now()}`, name: customItemName.trim(), price: String(price), taxRate: 0, maxStock: 9999 });
    setCustomItemName("");
    setCustomItemPrice("");
    setShowCustomItem(false);
    toast.success("Item added");
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  // Use refs so the single listener always closes over the latest functions.
  const handlePayRef  = useRef(handlePay);  handlePayRef.current  = handlePay;
  const handleHoldRef = useRef(handleHold); handleHoldRef.current = handleHold;
  const clearRef      = useRef(clear);      clearRef.current      = clear;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      // ── F-keys (work even while typing) ──────────────────────────────────
      if (e.key === "F2") {
        e.preventDefault();
        (document.getElementById("pos-search-input") as HTMLInputElement | null)?.focus();
        return;
      }
      if (e.key === "F4") {
        e.preventDefault();
        const el = document.querySelector(".cart-qty-input") as HTMLInputElement | null;
        el?.focus(); el?.select();
        return;
      }
      if (e.key === "F8") { e.preventDefault(); clearRef.current(); return; }

      // ── Escape — close open panels ─────────────────────────────────────────
      if (e.key === "Escape") {
        setShowScanner(false);
        setShowCustomItem(false);
        setShowHeld(false);
        return;
      }

      // ── Shift shortcuts — skip when user is typing in an input ────────────
      if (!e.shiftKey || isInput) return;

      switch (e.key) {
        case "C": e.preventDefault(); void handlePayRef.current(true);         break; // Pay/Print (uses stored default)
        case "U": e.preventDefault(); void handlePayRef.current(true, "a4");   break; // Pay/Print A4 (force override)
        case "P": e.preventDefault(); void handlePayRef.current(false);          break; // Pay Only
        case "E": e.preventDefault(); handleHoldRef.current();                   break; // Hold
        case "F": e.preventDefault(); router.push("/orders");                    break; // All Sales
        case "Y": e.preventDefault(); setShowHeld(true);                         break; // Pending Sales
        case "K":                                                                        // General Items
          e.preventDefault(); setIsFreeItem(false); setShowCustomItem(true); break;
        case "A":                                                                        // Focus customer input
          e.preventDefault();
          (document.getElementById("pos-customer-input") as HTMLInputElement | null)?.focus();
          (document.getElementById("pos-customer-input") as HTMLInputElement | null)?.select();
          break;
        case "W":                                                                        // Toggle payment method
          e.preventDefault();
          setPaymentMethod((m) => {
            const methods: PaymentMethod[] = ["cash", "credit_card", "debit_card", "cheque"];
            const idx = methods.indexOf(m);
            return methods[(idx + 1) % methods.length];
          });
          break;
      }

      // Digit-row Shift shortcuts (e.code is layout-independent)
      if (e.code === "Digit6") { e.preventDefault(); setIsFreeItem(true);  setShowCustomItem(true); } // Free Items
      if (e.code === "Digit9") { e.preventDefault(); router.push("/orders"); }                        // Market Return
      if (e.code === "Digit4") { e.preventDefault(); setAllDiscount((v) => !v); }                     // Toggle discount
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-surface-50 overflow-hidden">

      {/* HEADER */}
      <div className="flex items-center gap-4 px-3 py-2 shrink-0 bg-white border-b border-surface-200 shadow-sm">
        {/* Logo */}
        <div className="shrink-0 w-14 h-9 rounded bg-brand-700 flex items-center justify-center">
          <span className="text-white text-sm font-black tracking-wide">POS</span>
        </div>

        <Toggle label={t.pos.allDiscount} hint="Shift + 4" checked={allDiscount} onChange={setAllDiscount} />

        {/* Search */}
        <div className="flex-1 mx-3">
          <div className="flex items-stretch rounded-lg overflow-hidden border border-surface-200 shadow-sm">
            <div className="flex items-center justify-center px-3 bg-brand-700">
              <Search size={15} className="text-white" />
            </div>
            <input
              id="pos-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-white text-surface-900 text-sm px-3 py-2 focus:outline-none"
              placeholder={t.pos.searchProducts}
            />
          </div>
        </div>

        {/* Barcode Simulator */}
        <div className="relative shrink-0">
          <button
            onClick={() => { setShowScanner((v) => !v); setScanInput(""); }}
            title="Simulate barcode scan"
            className={`flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-sm font-medium transition-all border ${
              showScanner
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-surface-100 border-surface-200 text-surface-600 hover:bg-surface-200"
            }`}
          >
            <ScanLine size={15} />
            <span className="hidden sm:inline">Scan</span>
          </button>

          {showScanner && (
            <div className="absolute top-full right-0 mt-2 z-50 bg-white border border-surface-200 rounded-xl shadow-xl p-3 w-72">
              <p className="text-xs font-semibold text-surface-600 mb-1 flex items-center gap-1">
                <ScanLine size={12} className="text-amber-600" /> Barcode Simulator
              </p>
              <p className="text-xs text-surface-400 mb-2">
                Type a SKU or barcode value and press Enter (or click Scan).
              </p>
              <form
                onSubmit={(e) => { e.preventDefault(); handleSimulateScan(scanInput); }}
                className="flex gap-2"
              >
                <input
                  autoFocus
                  className="flex-1 border border-surface-200 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="e.g. SKU-001"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!scanInput.trim()}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
                >
                  Scan
                </button>
              </form>
              {/* Quick-pick: show first 5 products with SKUs */}
              {products && (
                <div className="mt-2 space-y-0.5 max-h-36 overflow-y-auto">
                  <p className="text-[10px] text-surface-400 uppercase tracking-wide mb-1">Quick-pick:</p>
                  {products
                    .filter((p) => p.sku)
                    .slice(0, 6)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSimulateScan(p.sku!)}
                        className="w-full text-left flex items-center justify-between px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors"
                      >
                        <span className="text-xs text-surface-700 font-medium truncate">{p.name}</span>
                        <code className="text-[10px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded ml-2 shrink-0">
                          {p.sku}
                        </code>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cashier */}
        <div className="shrink-0 flex items-center gap-2 text-base text-surface-600 pr-1">
          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-xs font-bold text-brand-700">{(userName || "U").slice(0, 2).toUpperCase()}</span>
          </div>
          <span>{t.common.cashier} : {userName || t.common.cashier}</span>
          <span className="text-surface-300">|</span>
          <span className="capitalize text-surface-500">{role || "staff"}</span>
        </div>
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — Cart table */}
        <div className="flex flex-col flex-1 overflow-hidden border-r border-surface-200">
          {/* Table header */}
          <div
            className="grid shrink-0 text-white text-sm font-bold px-2 py-2"
            style={{ gridTemplateColumns: "1fr 100px 90px 80px 120px", background: "#047857" }}
          >
            <div>{t.common.productName}</div>
            <div className="text-center">{t.pos.qty}</div>
            <div className="text-center">{t.common.price}</div>
            <div className="text-center">{t.pos.discount_col}</div>
            <div className="text-right pr-1">{t.pos.amount_col}</div>
          </div>

          {/* Cart rows */}
          <div className="flex-1 overflow-y-auto bg-white">
            {state.items.length === 0 ? (
              <div className="flex items-center justify-center h-full text-surface-400 text-sm select-none">
{t.pos.emptyCart}
              </div>
            ) : (
              state.items.map((item, idx) => (
                <div
                  key={item.productId}
                  className="grid items-center px-2 py-1.5 border-b border-surface-100 hover:bg-brand-50 transition-colors"
                  style={{ gridTemplateColumns: "1fr 100px 90px 80px 120px", background: idx % 2 === 0 ? "#fff" : "#f9fafb" }}
                >
                  <div
                    className="font-semibold text-sm leading-tight pr-2 text-surface-800 flex items-center gap-2 cursor-pointer hover:text-red-500"
                    onClick={() => removeItem(item.productId)}
                    title="Click to remove"
                  >
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.productName} className="w-6 h-6 rounded object-cover shrink-0" />
                    )}
                    <span className="truncate">{item.productName}</span>
                  </div>
                  <div className="flex items-center justify-center gap-0.5">
                    <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-4 h-4 rounded bg-surface-200 hover:bg-brand-100 text-surface-700 flex items-center justify-center">
                      <Minus size={8} strokeWidth={3} />
                    </button>
                    <input
                      type="number" min={1} max={item.maxStock} value={item.quantity}
                      onChange={(e) => updateQty(item.productId, parseInt(e.target.value) || 1)}
                      className="cart-qty-input w-9 text-center text-sm bg-white text-surface-900 border border-surface-300 rounded px-0.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <button onClick={() => updateQty(item.productId, item.quantity + 1)} disabled={item.quantity >= item.maxStock} className="w-4 h-4 rounded bg-brand-600 hover:bg-brand-700 disabled:opacity-30 text-white flex items-center justify-center">
                      <Plus size={8} strokeWidth={3} />
                    </button>
                  </div>
                  <div className="text-center text-sm text-surface-700">Rs.{item.productPrice.toFixed(0)}</div>
                  <div className="text-center text-sm text-surface-600">0</div>
                  <div className="text-right text-sm font-bold text-surface-900 pr-1">Rs.{item.subtotal.toFixed(2)}</div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex shrink-0 border-t-2 border-surface-200">
            <div className="flex items-center gap-2 flex-1 px-4 py-4 bg-brand-600">
              <span className="text-white text-xl font-bold">{t.common.discount}</span>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-white text-xl font-semibold">Rs.</span>
                <input
                  type="number" min={0} value={state.discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 text-right text-xl bg-white/30 text-white border border-white/40 rounded px-2 py-1.5 focus:outline-none placeholder-white/60"
                />
              </div>
            </div>
            {cardFee > 0 && (
              <div className="flex items-center gap-2 px-5 py-4 bg-amber-600" style={{ minWidth: 180 }}>
                <span className="text-white text-lg font-bold">Card Fee (3%)</span>
                <span className="text-white text-lg font-bold ml-auto">Rs.{cardFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex flex-col items-end justify-center px-6 py-4 bg-red-600" style={{ minWidth: 220 }}>
              <span className="text-white text-base font-bold tracking-wide">{t.common.subtotal}</span>
              <span className="text-white text-2xl font-black leading-tight">Rs.{finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* MIDDLE — Payment + Buttons */}
        <div className="flex flex-col shrink-0 p-3 gap-2 overflow-y-auto bg-white border-r border-surface-200" style={{ width: 330 }}>

          {/* Promo Code */}
          <div>
            <div className="text-surface-500 text-xs mb-1 font-semibold uppercase tracking-wide">{t.pos.promoCode}</div>
            <div className="flex gap-1">
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                className="flex-1 bg-white text-surface-900 text-sm px-3 py-2 rounded-lg border border-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase placeholder-surface-400"
                placeholder={t.pos.enterCode}
              />
              <button onClick={handleApplyPromo} className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-lg">{t.pos.apply}</button>
            </div>
            {promoDiscount > 0 && (
              <p className="text-xs text-green-600 font-semibold mt-0.5">Discount: Rs.{promoDiscount.toFixed(2)} applied</p>
            )}
          </div>

          {/* Loyalty */}
          {enableLoyalty && (
            <div>
              <div className="text-surface-500 text-xs mb-1 font-semibold uppercase tracking-wide">{t.pos.loyaltyPhone}</div>
              <div className="flex gap-1">
                <input
                  value={loyaltyPhoneInput}
                  onChange={(e) => setLoyaltyPhoneInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLoyaltyLookup()}
                  className="flex-1 bg-white text-surface-900 text-sm px-3 py-2 rounded-lg border border-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder={t.pos.phoneNumber}
                />
                <button onClick={handleLoyaltyLookup} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg">{t.pos.find}</button>
              </div>
              {loyaltyResult.data && (
                <div className="mt-1 p-2 rounded-lg bg-purple-50 border border-purple-200">
                  <p className="text-xs font-semibold text-purple-800">{loyaltyResult.data.name} — {loyaltyResult.data.points} pts</p>
                  {parseFloat((loyaltyResult.data as any).creditBalance ?? "0") > 0 && (
                    <p className="text-xs text-orange-600 font-semibold mt-0.5">
                      Outstanding: Rs.{parseFloat((loyaltyResult.data as any).creditBalance).toFixed(2)}
                    </p>
                  )}
                  {loyaltyResult.data.points > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-purple-600">Redeem:</span>
                      <input
                        type="number" min={0} max={loyaltyResult.data.points} value={redeemPoints}
                        onChange={(e) => setRedeemPoints(Math.min(parseInt(e.target.value) || 0, loyaltyResult.data!.points))}
                        className="w-16 text-xs px-1 py-0.5 rounded border border-purple-300 text-purple-900 bg-white"
                      />
                      <span className="text-xs text-purple-600">pts</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="text-surface-500 text-xs mb-1 font-semibold uppercase tracking-wide">{t.pos.paymentMethod} <span className="font-normal normal-case">(Shift+W)</span></div>            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full bg-white text-surface-900 text-base px-3 py-2 rounded-lg border border-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="cash">{t.pos.cash}</option>
              <option value="credit_card">{t.pos.paymentMethodCreditCard}</option>
              <option value="debit_card">{t.pos.paymentMethodDebitCard}</option>
              <option value="cheque">{t.pos.paymentMethodCheque}</option>
              <option value="card">{t.pos.paymentMethodCardGeneric}</option>
              {enableLoyalty && loyaltyResult.data && parseFloat((loyaltyResult.data as any).creditLimit ?? "0") > 0 && (
                <option value="account_credit">{t.pos.paymentMethodAccountCredit}</option>
              )}
            </select>
          </div>
          {/* Credit account info panel */}
          {enableLoyalty && paymentMethod === "account_credit" && loyaltyResult.data && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs font-semibold text-amber-900 mb-1.5">
                {loyaltyResult.data.name} — {t.pos.accountCreditTitle}
              </p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
                <span className="text-surface-500">{t.pos.creditLimit}</span>
                <span className="font-semibold text-right">Rs.{creditLimit.toFixed(2)}</span>
                <span className="text-surface-500">{t.pos.balanceOwed}</span>
                <span className="font-semibold text-right text-orange-600">Rs.{creditBalance.toFixed(2)}</span>
                <span className="text-surface-500">{t.pos.available}</span>
                <span className={`font-semibold text-right ${availableCredit >= finalTotal ? "text-green-700" : "text-red-600"}`}>
                  Rs.{availableCredit.toFixed(2)}
                </span>
              </div>
              {availableCredit < finalTotal && (
                <p className="text-xs text-red-600 font-semibold mt-1">
                  {t.pos.insufficientCredit} (need Rs.{finalTotal.toFixed(2)})
                </p>
              )}
            </div>
          )}

          {isCardPayment && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-amber-200 bg-amber-50">
              <span className="text-sm font-semibold text-amber-800">{t.pos.cardFee}</span>
              <button
                onClick={() => setCardFeeEnabled((v) => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  cardFeeEnabled ? "bg-amber-500" : "bg-surface-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    cardFeeEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}
          <div>
            <div className="text-surface-500 text-xs mb-1 font-semibold uppercase tracking-wide">{t.pos.route}</div>
            <input value={route} onChange={(e) => setRoute(e.target.value)} placeholder={t.common.none} className="w-full bg-white text-surface-900 text-base px-3 py-2 rounded-lg border border-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <div className="text-surface-500 text-xs mb-1 font-semibold uppercase tracking-wide">{t.pos.customer}</div>
            {/* Phone lookup row */}
            <div className="flex gap-1 mb-1">
              <input
                type="tel"
                value={custPhoneInput}
                onChange={(e) => {
                  setCustPhoneInput(e.target.value);
                  if (!e.target.value.trim()) { setCustPhone(""); setCustomer(""); setSaveNewCustomer(false); }
                }}
                onKeyDown={(e) => { if (e.key === "Enter") { setCustPhone(custPhoneInput.trim()); } }}
                placeholder="Phone number"
                className="flex-1 bg-white text-surface-900 text-sm px-3 py-2 rounded-lg border border-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={() => setCustPhone(custPhoneInput.trim())}
                className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-lg"
              >{t.pos.find}</button>
            </div>
            {/* Found customer */}
            {custPhone && checkoutCustomer.data && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg mb-1">
                <span className="flex-1 text-sm font-semibold text-emerald-800">{checkoutCustomer.data.name}</span>
                {checkoutCustomer.data.phone && <span className="text-xs text-emerald-600 font-mono">{checkoutCustomer.data.phone}</span>}
                <span className="text-xs bg-emerald-200 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">Saved</span>
                <button onClick={() => { setCustPhone(""); setCustPhoneInput(""); setCustomer(""); }} className="text-emerald-400 hover:text-emerald-700"><X size={14} /></button>
              </div>
            )}
            {/* Not found — manual name entry */}
            {custPhone && checkoutCustomer.isFetched && !checkoutCustomer.data && (
              <div className="space-y-1">
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder={t.pos.walkInCustomer}
                  className="w-full bg-white text-surface-900 text-sm px-3 py-2 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <label className="flex items-center gap-2 text-xs text-surface-600 cursor-pointer select-none">
                  <input type="checkbox" checked={saveNewCustomer} onChange={(e) => setSaveNewCustomer(e.target.checked)} className="rounded" />
                  Save to customer database
                </label>
              </div>
            )}
            {/* No phone entered — plain name input */}
            {!custPhone && (
              <input
                id="pos-customer-input"
                list="customer-list"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="w-full bg-white text-surface-900 text-base px-3 py-2 rounded-lg border border-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder={t.pos.walkInCustomer}
              />
            )}
            <datalist id="customer-list">
              {savedCustomers.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          {paymentMethod === "cash" && (
            <>
              <div>
                <div className="text-surface-500 text-xs mb-1 font-semibold uppercase tracking-wide">{t.pos.cash}</div>
                <input type="number" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} className="w-full bg-white text-surface-900 text-base px-3 py-2 rounded-lg border border-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="0.00" />
              </div>
              <div>
                <div className="text-surface-500 text-xs mb-1 font-semibold uppercase tracking-wide">{t.pos.balance}</div>
                <input
                  readOnly
                  value={cashAmount ? Math.max(0, balance).toFixed(2) : "0.00"}
                  className={`w-full text-base px-3 py-2 rounded-lg border cursor-default focus:outline-none font-semibold ${
                    cashAmount && balance > 0
                      ? "bg-green-50 border-green-300 text-green-700"
                      : "bg-surface-100 border-surface-200 text-surface-600"
                  }`}
                />
              </div>
              {cashAmount && balance < 0 && (
                <p className="text-sm text-red-500 font-semibold -mt-1">Short Rs.{Math.abs(balance).toFixed(2)}</p>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-1 mt-1">
            <Btn hint="Shift+C" label={t.pos.payPrint} color="#047857" onClick={() => handlePay(true)} />
            <Btn hint="Shift+U" label={t.pos.payPrintA4} color="#059669" onClick={() => handlePay(true, "a4")} />
          </div>
          <div className="grid grid-cols-2 gap-1">
            <Btn hint="Shift+P" label={t.pos.payOnly} color="#065f46" onClick={() => handlePay(false)} />
            <Btn hint="Shift+E" label={t.pos.hold} color="#6a1a9a" onClick={handleHold} />
          </div>
          <div className="grid grid-cols-3 gap-1">
            <Btn hint="Shift+F" label={t.pos.allSales} color="#047857" onClick={() => router.push("/orders")} />
            <Btn hint="Shift+Y" label={t.pos.pendingSales} color="#ad1457" onClick={() => setShowHeld(true)} />
            <Btn hint="Shift+K" label={t.pos.generalItems} color="#1565c0" onClick={() => { setIsFreeItem(false); setShowCustomItem(true); }} />
          </div>
          <div className="grid grid-cols-2 gap-1">
            <Btn hint="Shift+6" label={t.pos.freeItems} color="#059669" onClick={() => { setIsFreeItem(true); setShowCustomItem(true); }} />
            <Btn hint="Shift+9" label={t.pos.marketReturn} color="#047857" onClick={() => router.push("/orders")} />
          </div>
          <div className="grid grid-cols-3 gap-1">
            <Btn hint="F8" label={t.common.delete} color="#dc2626" onClick={clear} />
            <Btn hint="F2" label={t.common.search} color="#2563eb" onClick={() => (document.querySelector("input[placeholder*='Search']") as HTMLInputElement)?.focus()} />
            <Btn hint="F4" label={t.pos.qty} color="#059669" onClick={() => { const el = document.querySelector(".cart-qty-input") as HTMLInputElement; el?.focus(); el?.select(); }} />
          </div>
        </div>

        {/* RIGHT — Product Picker */}
        <div className="flex flex-col shrink-0 overflow-hidden bg-surface-50 border-l border-surface-200" style={{ width: 340 }}>
          {/* Top bar */}
          <div className="flex items-center gap-1 p-1.5 shrink-0 bg-white border-b border-surface-200">
            <button
              onClick={() => { (document.getElementById("pos-customer-input") as HTMLInputElement | null)?.focus(); (document.getElementById("pos-customer-input") as HTMLInputElement | null)?.select(); }}
              className="flex-1 text-white text-xs font-bold py-2 px-2 rounded-lg leading-tight text-left bg-brand-700 hover:bg-brand-800 transition-colors"
            >
              <span className="block text-[10px] text-brand-200">Shift+A</span>
              {t.pos.addCustomer}
            </button>
            <select
              className="flex-1 bg-white text-surface-900 text-sm rounded-lg px-2 py-2 border border-surface-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value=""
              onChange={(e) => {
                const held = heldOrders.find((h) => h.id === e.target.value);
                if (held) handleRecall(held);
              }}
            >
              <option value="">{t.pos.pendingSales} ({heldOrders.length})</option>
              {heldOrders.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.customerName} · {h.items.length} items · {new Date(h.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </option>
              ))}
            </select>
            <button className="w-8 h-8 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold flex items-center justify-center transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Open Bill */}
          <div className="px-2 py-1.5 shrink-0 bg-white border-b border-surface-200">
            <select className="w-full bg-white text-surface-900 text-sm rounded-lg px-2 py-2 border border-surface-200 focus:outline-none focus:ring-1 focus:ring-brand-500">
              <option>{t.pos.openBill}</option>
            </select>
          </div>

          {/* Right search */}
          <div className="px-2 py-1.5 shrink-0 bg-white border-b border-surface-200">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-50 text-surface-900 text-sm px-3 py-1.5 rounded-lg border border-surface-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder={t.common.search}
            />
          </div>

          {/* Category buttons */}
          {categories && categories.length > 0 && (
            <div className="grid grid-cols-4 gap-0.5 px-1.5 py-1.5 shrink-0 bg-white border-b border-surface-200">
              <button
                onClick={() => setCategoryId(undefined)}
                className={`text-sm font-semibold py-1.5 rounded-lg truncate transition-colors ${!categoryId ? "bg-brand-700 text-white" : "bg-surface-100 text-surface-600 hover:bg-brand-50 hover:text-brand-700"}`}
              >
                {t.common.all}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`text-xs font-semibold py-1.5 rounded-lg truncate px-0.5 transition-colors ${categoryId === cat.id ? "bg-brand-700 text-white" : "bg-surface-100 text-surface-600 hover:bg-brand-50 hover:text-brand-700"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Product cards */}
          <div className="flex-1 overflow-y-auto p-1.5">
            {productsLoading ? (
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-lg bg-surface-200 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {products?.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleAdd(product)}
                    disabled={product.stock <= 0}
                    className="flex flex-col rounded-lg overflow-hidden text-left bg-white border border-surface-200 hover:border-brand-400 hover:shadow-sm transition-all disabled:opacity-60 active:scale-95"
                  >
                    <div className="w-full aspect-square flex items-center justify-center relative overflow-hidden bg-brand-50">
                      {product.stock <= 0 && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 bg-red-500/85">
                          <span className="text-[9px] font-black text-white text-center leading-tight px-0.5">{t.pos.outOfStockLabel}</span>
                        </div>
                      )}
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={16} className="text-brand-300" />
                      )}
                    </div>
                    <div className="px-1 pt-0.5 pb-1">
                      <div className="text-brand-700 text-xs font-bold">Rs.{parseFloat(product.price).toFixed(0)}</div>
                      <div className="text-surface-400 text-[10px] truncate">{product.sku || product.id.slice(0, 7)}</div>
                      <div className="text-surface-700 text-[10px] truncate">{product.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bottom shortcut bar */}
          <div className="flex shrink-0 gap-1 p-1.5 bg-white border-t border-surface-200">
            {[
              { label: "Shift+A", color: "#047857" },
              { label: "Shift+D", color: "#059669" },
              { label: "Shift+3", color: "#065f46" },
              { label: "Shift+1", color: "#047857" },
            ].map((b) => (
              <button key={b.label} className="flex-1 text-white text-xs font-bold py-1.5 rounded-lg" style={{ background: b.color }} onClick={() => toast(b.label)}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ── Held Orders Modal ── */}
      {showHeld && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
              <h2 className="font-bold text-surface-900">Held Orders ({heldOrders.length})</h2>
              <button onClick={() => setShowHeld(false)} className="text-surface-400 hover:text-surface-700"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {heldOrders.length === 0 ? (
                <p className="text-center text-surface-400 text-sm py-8">No held orders</p>
              ) : heldOrders.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-3 border border-surface-200 rounded-xl">
                  <div>
                    <p className="font-semibold text-surface-800 text-sm">{h.customerName}</p>
                    <p className="text-xs text-surface-500">{h.items.length} item(s) · Rs.{h.items.reduce((s, i) => s + i.subtotal, 0).toFixed(2)}</p>
                    <p className="text-xs text-surface-400">{new Date(h.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRecall(h)} className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors">Recall</button>
                    <button onClick={() => handleDeleteHeld(h.id)} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold rounded-lg transition-colors">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Custom / Free Item Modal ── */}
      {showCustomItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
              <h2 className="font-bold text-surface-900">{isFreeItem ? t.pos.freeItem : t.pos.customItem}</h2>
              <button onClick={() => setShowCustomItem(false)} className="text-surface-400 hover:text-surface-700"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.pos.itemName}</label>
                <input
                  autoFocus
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustomItem()}
                  className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Custom Service"
                />
              </div>
              {!isFreeItem && (
                <div>
                  <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.common.price} (Rs.)</label>
                  <input
                    type="number" min={0}
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCustomItem()}
                    className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="0.00"
                  />
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowCustomItem(false)} className="flex-1 py-2.5 border border-surface-200 rounded-xl text-sm font-semibold text-surface-600 hover:bg-surface-50 transition-colors">{t.common.cancel}</button>
                <button onClick={handleAddCustomItem} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors">{t.pos.addToCart}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Variant Picker Modal ── */}
      {variantPickerProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
              <div>
                <h2 className="font-bold text-surface-900">{variantPickerProduct.name}</h2>
                <p className="text-xs text-surface-400 mt-0.5">{t.pos.selectVariant}</p>
              </div>
              <button onClick={() => setVariantPickerProduct(null)} className="text-surface-400 hover:text-surface-700"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {variantPickerProduct.variants.map((v) => {
                const finalPrice = parseFloat(variantPickerProduct.price) + parseFloat(v.priceDiff);
                const diff = parseFloat(v.priceDiff);
                return (
                  <button
                    key={v.id}
                    disabled={v.stock <= 0}
                    onClick={() => handleAddVariant(variantPickerProduct, v)}
                    className="w-full flex items-center justify-between p-3 border rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-colors disabled:opacity-50 text-left"
                  >
                    <div>
                      <span className="text-sm font-semibold text-surface-800">{v.name}: {v.value}</span>
                      {diff !== 0 && (
                        <span className={`ml-2 text-xs ${diff > 0 ? "text-green-600" : "text-red-500"}`}>
                          ({diff > 0 ? "+" : ""}{diff.toFixed(2)})
                        </span>
                      )}
                      {v.stock <= 0 && <span className="ml-2 text-xs text-red-500">{t.pos.outOfStockLabel}</span>}
                    </div>
                    <span className="text-sm font-bold text-brand-700">Rs.{finalPrice.toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* ── Share Receipt Modal ── */}
      {shareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <div>
                <h2 className="font-bold text-surface-900 text-base">Send Receipt</h2>
                <p className="text-xs text-surface-400 mt-0.5">Order {shareModal.receiptData.orderNumber}</p>
              </div>
              <button
                onClick={() => setShareModal(null)}
                className="text-surface-400 hover:text-surface-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Customer info */}
              <div className="bg-surface-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-surface-800">
                    {shareModal.receiptData.customerName}
                  </p>
                  <p className="text-xs text-surface-400">
                    Rs. {shareModal.receiptData.billAmount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {sharePhone && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                    {customerByPhone.data ? "Saved Customer" : "Loyalty"}
                  </span>
                )}
              </div>

              {/* Phone input */}
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={sharePhone}
                  onChange={(e) => setSharePhone(e.target.value)}
                  placeholder="e.g. 94771234567"
                  className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Email input */}
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="customer@email.com"
                  className="w-full border border-surface-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  disabled={!sharePhone.trim()}
                  onClick={() => {
                    const rd = { ...shareModal.receiptData, customerPhone: sharePhone.trim(), customerEmail: shareEmail.trim() || undefined };
                    const text = `*Invoice #${rd.orderNumber}*\nDate: ${rd.date.toLocaleDateString()}\nCustomer: ${rd.customerName}\n\nItems:\n${rd.items.map(i => `- ${i.name} x${i.quantity} = Rs.${i.amount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`).join("\n")}\n\nTotal: Rs.${rd.billAmount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}\n\nThank You!`;
                    window.open(`https://web.whatsapp.com/send?phone=${sharePhone.replace(/[^0-9]/g, "")}&text=${encodeURIComponent(text)}`, "_blank");
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 bg-[#25D366] hover:bg-[#20bc5a] disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <MessageCircle size={15} /> WhatsApp
                </button>
                <button
                  disabled={!shareEmail.trim()}
                  onClick={() => {
                    const rd = shareModal.receiptData;
                    const subject = `Invoice #${rd.orderNumber}`;
                    const body = `Dear ${rd.customerName},\n\nThank you for your purchase!\n\nOrder: ${rd.orderNumber}\nDate: ${rd.date.toLocaleDateString()}\n\nItems:\n${rd.items.map(i => `- ${i.name} x${i.quantity} = Rs.${i.amount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`).join("\n")}\n\nTotal: Rs.${rd.billAmount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}\n\nThank You!`;
                    window.open(`mailto:${shareEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <Mail size={15} /> Email
                </button>
                <button
                  onClick={() => { printReceipt({ ...shareModal.receiptData, customerPhone: sharePhone || undefined, customerEmail: shareEmail || undefined }, "80mm"); toast.success(`Order ${shareModal.receiptData.orderNumber} completed!`); setShareModal(null); }}
                  className="flex items-center justify-center gap-2 py-2.5 bg-surface-700 hover:bg-surface-800 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <Printer size={15} /> Print 80mm
                </button>
                <button
                  onClick={() => { printReceipt({ ...shareModal.receiptData, customerPhone: sharePhone || undefined, customerEmail: shareEmail || undefined }, "a4"); toast.success(`Order ${shareModal.receiptData.orderNumber} completed!`); setShareModal(null); }}
                  className="flex items-center justify-center gap-2 py-2.5 bg-surface-600 hover:bg-surface-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <Printer size={15} /> Print A4
                </button>
              </div>

              <button
                onClick={() => { toast.success(`Order ${shareModal.receiptData.orderNumber} completed!`); setShareModal(null); }}
                className="w-full py-2 text-sm text-surface-400 hover:text-surface-600 font-medium transition-colors"
              >
                Skip / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
