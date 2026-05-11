import { useEffect, useRef, useCallback } from "react";

/**
 * Barcode Scanner Hook
 *
 * Works with USB barcode scanners (HID mode) which act as keyboards.
 * They type characters very rapidly (< 50ms between each) and end with Enter.
 *
 * Camera barcode scanning can be added later using:
 * - `@zxing/library` (ZXing JS)
 * - `quagga2`
 * - `html5-qrcode`
 */
export function useBarcodeScanner(
  onScan: (barcode: string) => void,
  enabled = true
) {
  const buffer = useRef("");
  const lastKeyTime = useRef(0);
  const stableOnScan = useRef(onScan);

  // Keep ref up-to-date without re-subscribing
  useEffect(() => { stableOnScan.current = onScan; }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();

      // Scanner types very fast — if gap > 100ms, it's a human typing, reset
      if (now - lastKeyTime.current > 100) {
        buffer.current = "";
      }
      lastKeyTime.current = now;

      if (e.key === "Enter") {
        const scanned = buffer.current.trim();
        buffer.current = "";
        // Fire only if we have a plausible barcode (4+ chars)
        if (scanned.length >= 4) {
          stableOnScan.current(scanned);
        }
      } else if (e.key.length === 1) {
        // Printable character
        buffer.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}
