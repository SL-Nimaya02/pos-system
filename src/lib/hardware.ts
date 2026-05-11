/**
 * Hardware Integration Stubs
 *
 * This file contains stub functions for hardware integrations.
 * Each function includes instructions for completing the integration.
 */

// ─── ESC/POS Thermal Receipt Printer ─────────────────────────────────────────
/**
 * To integrate a real thermal printer:
 * 1. Install: npm install node-escpos escpos-usb
 * 2. Or use the cloud printing API: Star Micronics Cloud, PrintNode, or CUPS
 * 3. For web: use the Web USB API (Chrome only) or a local bridge app
 *
 * For now this falls back to the browser print dialog.
 */
export interface ReceiptPrintData {
  orderNumber: string;
  storeName: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  changeDue?: number;
  footer?: string;
}

export async function printToThermal(data: ReceiptPrintData): Promise<void> {
  // TODO: Replace with real ESC/POS integration
  // Example with node-escpos (requires a backend endpoint):
  //
  // await fetch("/api/print", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(data),
  // });
  //
  // For now, trigger browser print as fallback
  console.warn("[Hardware] Thermal printer not configured. Falling back to browser print.");
  window.print();
}

// ─── Cash Drawer ──────────────────────────────────────────────────────────────
/**
 * To integrate a cash drawer:
 * 1. Cash drawers are typically connected via the receipt printer (DK port)
 * 2. Sending ESC/POS command `0x10 0x14 0x01 0x00 0x05` opens the drawer
 * 3. Or use a USB HID cash drawer with the Web USB API
 *
 * Alternatives: Star Micronics, Epson, APG cash drawers all support this.
 */
export async function openCashDrawer(): Promise<void> {
  // TODO: Replace with real cash drawer command
  // Example via printer bridge:
  //
  // await fetch("/api/cash-drawer/open", { method: "POST" });
  //
  console.warn("[Hardware] Cash drawer not configured. Please connect via ESC/POS printer port.");
  // Stub: show a visual notification instead
  alert("💰 Open cash drawer (hardware not yet configured)");
}

// ─── Stripe Terminal (Card Machine) ───────────────────────────────────────────
/**
 * To integrate Stripe Terminal:
 * 1. Install: npm install @stripe/terminal-js
 * 2. Create a ConnectionToken endpoint: /api/stripe/connection-token
 * 3. Follow: https://stripe.com/docs/terminal/quickstart
 *
 * Supported readers: BBPOS WisePOS E, Stripe Reader S700, etc.
 */
export interface StripeTerminalConfig {
  locationId: string;
  currency: string;
}

export async function collectStripeTerminalPayment(
  _amount: number, // in cents
  _config: StripeTerminalConfig
): Promise<{ success: boolean; paymentIntentId?: string; error?: string }> {
  // TODO: Replace with real Stripe Terminal integration
  // import { loadStripeTerminal } from "@stripe/terminal-js";
  //
  // const terminal = await loadStripeTerminal();
  // const { error: connectError } = await terminal.connectReader(reader);
  // const { paymentIntent, error } = await terminal.collectPaymentMethod(clientSecret);
  //
  console.warn("[Hardware] Stripe Terminal not configured.");
  return { success: false, error: "Stripe Terminal not configured yet." };
}

// ─── Barcode / Label Printer ──────────────────────────────────────────────────
/**
 * To print product barcode labels:
 * 1. Use a Zebra or Dymo label printer
 * 2. Dymo: npm install dymojs
 * 3. Zebra: Use ZPL language via Web USB or PrintNode
 */
export async function printBarcodeLabel(
  _sku: string,
  _productName: string,
  _price: number
): Promise<void> {
  // TODO: Implement with Dymo/Zebra SDK
  console.warn("[Hardware] Barcode label printer not configured.");
}

// ─── Kitchen Display System (KDS) ────────────────────────────────────────────
/**
 * To push orders to a Kitchen Display System:
 * 1. Use Supabase Realtime (already in stack) to broadcast new orders
 * 2. The KDS page (/kds) subscribes to the realtime channel
 * 3. Or use a WebSocket server
 *
 * See: src/app/(dashboard)/kds/page.tsx for the display UI stub
 */
export async function pushOrderToKDS(orderId: string): Promise<void> {
  // TODO: Implement with Supabase Realtime
  // import { supabase } from "@/lib/supabase";
  // await supabase.channel("kds").send({ type: "broadcast", event: "new_order", payload: { orderId } });
  console.info("[KDS] Order broadcast stub:", orderId);
}
