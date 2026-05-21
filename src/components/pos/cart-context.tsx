"use client";

import { createContext, useContext, useReducer, useCallback, useEffect } from "react";

const CART_KEY = "pos_cart";

export interface CartItem {
  productId: string;
  productName: string;
  productPrice: number;
  taxRate: number;
  maxStock: number;
  quantity: number;
  subtotal: number;
}

interface CartState {
  items: CartItem[];
  discount: number;
}

type CartAction =
  | { type: "ADD_ITEM"; product: { id: string; name: string; price: string; taxRate: number; maxStock: number } }
  | { type: "REMOVE_ITEM"; productId: string }
  | { type: "UPDATE_QTY"; productId: string; quantity: number }
  | { type: "SET_DISCOUNT"; discount: number }
  | { type: "CLEAR" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find((i) => i.productId === action.product.id);
      const price = parseFloat(action.product.price);
      const taxRate = action.product.taxRate;
      const maxStock = action.product.maxStock;
      if (existing) {
        // Don't exceed available stock
        if (existing.quantity >= maxStock) return state;
        return {
          ...state,
          items: state.items.map((i) =>
            i.productId === action.product.id
              ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * price }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [
          ...state.items,
          { productId: action.product.id, productName: action.product.name, productPrice: price, taxRate, maxStock, quantity: 1, subtotal: price },
        ],
      };
    }
    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter((i) => i.productId !== action.productId) };
    case "UPDATE_QTY":
      if (action.quantity <= 0) {
        return { ...state, items: state.items.filter((i) => i.productId !== action.productId) };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.productId === action.productId
            ? {
                ...i,
                quantity: Math.min(action.quantity, i.maxStock),
                subtotal: Math.min(action.quantity, i.maxStock) * i.productPrice,
              }
            : i
        ),
      };
    case "SET_DISCOUNT":
      return { ...state, discount: action.discount };
    case "CLEAR":
      return { ...state, items: [], discount: 0 };
    default:
      return state;
  }
}

const CartContext = createContext<{
  state: CartState;
  subtotal: number;
  taxAmount: number;
  total: number;
  addItem: (product: { id: string; name: string; price: string; taxRate: number; maxStock: number }) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  setDiscount: (discount: number) => void;
  clear: () => void;
} | null>(null);

const initialState: CartState = { items: [], discount: 0 };

function loadFromStorage(): CartState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartState) : initialState;
  } catch {
    return initialState;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // After hydration, restore cart from localStorage once
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored.items.length > 0 || stored.discount !== 0) {
      stored.items.forEach((item) =>
        dispatch({ type: "ADD_ITEM", product: { id: item.productId, name: item.productName, price: String(item.productPrice), taxRate: item.taxRate, maxStock: item.maxStock } })
      );
      if (stored.discount) dispatch({ type: "SET_DISCOUNT", discount: stored.discount });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist cart to localStorage on every change
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(state));
  }, [state]);

  const subtotal = state.items.reduce((sum, i) => sum + i.subtotal, 0);
  const discountAmount = state.discount;
  const taxAmount = state.items.reduce((sum, i) => sum + (i.subtotal * (i.taxRate ?? 0)) / 100, 0);
  const total = subtotal - discountAmount + taxAmount;

  const addItem = useCallback(
    (product: { id: string; name: string; price: string; taxRate: number; maxStock: number }) =>
      dispatch({ type: "ADD_ITEM", product }),
    []
  );
  const removeItem = useCallback(
    (productId: string) => dispatch({ type: "REMOVE_ITEM", productId }),
    []
  );
  const updateQty = useCallback(
    (productId: string, quantity: number) => dispatch({ type: "UPDATE_QTY", productId, quantity }),
    []
  );
  const setDiscount = useCallback(
    (discount: number) => dispatch({ type: "SET_DISCOUNT", discount }),
    []
  );
  const clear = useCallback(() => dispatch({ type: "CLEAR" }), []);

  return (
    <CartContext.Provider
      value={{ state, subtotal, taxAmount, total, addItem, removeItem, updateQty, setDiscount, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
