import { CartProvider } from "@/components/pos/cart-context";
import { POSTerminal } from "@/components/pos/pos-terminal";

export default function POSPage() {
  return (
    <CartProvider>
      <div className="h-full flex flex-col overflow-hidden">
        <POSTerminal />
      </div>
    </CartProvider>
  );
}
