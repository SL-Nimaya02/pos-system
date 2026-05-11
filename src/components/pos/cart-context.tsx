"use client";

import { createContext, useContext, useReducer, useCallback } from "react";

export interface CartItem {
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  subtotal: number;
}

interface CartState {
  items: CartItem[];
  discount: number;
  taxRate: number;
}

type CartAction =
  | { type: "ADD_ITEM"; product: { id: string; name: string; price: string } }
  | { type: "REMOVE_ITEM"; productId: string }
  | { type: "UPDATE_QTY"; productId: string; quantity: number }
  | { type: "SET_DISCOUNT"; discount: number }
  | { type: "CLEAR" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find((i) => i.productId === action.product.id);
      const price = parseFloat(action.product.price);
      if (existing) {
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
          {
            productId: action.product.id,
            productName: action.product.name,
            productPrice: price,
            quantity: 1,
            subtotal: price,
          },
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
            ? { ...i, quantity: action.quantity, subtotal: action.quantity * i.productPrice }
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
  addItem: (product: { id: string; name: string; price: string }) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  setDiscount: (discount: number) => void;
  clear: () => void;
} | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    discount: 0,
    taxRate: 0.1, // 10%
  });

  const subtotal = state.items.reduce((sum, i) => sum + i.subtotal, 0);
  const discountAmount = state.discount;
  const taxAmount = (subtotal - discountAmount) * state.taxRate;
  const total = subtotal - discountAmount + taxAmount;

  const addItem = useCallback(
    (product: { id: string; name: string; price: string }) =>
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
