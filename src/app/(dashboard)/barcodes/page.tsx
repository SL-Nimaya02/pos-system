"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { QrCode, Printer, Search, Tag, ScanLine, CheckCircle2, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

declare global {
  interface Window {
    JsBarcode?: (
      element: SVGSVGElement | string,
      value: string,
      options?: Record<string, unknown>
    ) => void;
  }
}

const COPY_PRESETS = [1, 5, 10, 20, 50];

export default function BarcodesPage() {
  const { t } = useLanguage();
  const [search, setSearch]       = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [copies, setCopies]       = useState(1);
  const [jsLoaded, setJsLoaded]   = useState(false);
  const previewRef = useRef<SVGSVGElement>(null);

  const [testBarcode, setTestBarcode] = useState("");
  type ScanResult = { found: true; name: string; price: string; sku: string | null } | { found: false; barcode: string };
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const { data: products } = trpc.products.list.useQuery({ activeOnly: false });

  const filtered = products?.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku ?? "").toLowerCase().includes(q)
    );
  });

  const selected    = products?.find((p) => p.id === selectedId);
  const barcodeValue = selected
    ? (selected.sku?.trim() || `P${selected.id.slice(-10).toUpperCase()}`)
    : "";

  const handleTestScan = (value?: string) => {
    const code = (value ?? testBarcode).trim();
    if (!code || !products) return;
    const match = products.find(
      (p) => p.sku === code || `P${p.id.slice(-10).toUpperCase()}` === code
    );
    setScanResult(
      match
        ? { found: true, name: match.name, price: match.price, sku: match.sku }
        : { found: false, barcode: code }
    );
  };

  // Load JsBarcode CDN once
  useEffect(() => {
    if (window.JsBarcode) { setJsLoaded(true); return; }
    const existing = document.getElementById("jsbarcode-cdn") as HTMLScriptElement | null;
    if (existing) { existing.addEventListener("load", () => setJsLoaded(true)); return; }
    const s = document.createElement("script");
    s.id  = "jsbarcode-cdn";
    s.src = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js";
    s.addEventListener("load", () => setJsLoaded(true));
    document.head.appendChild(s);
  }, []);

  // Re-render preview whenever product or JS changes
  useEffect(() => {
    if (!jsLoaded || !selected || !previewRef.current || !barcodeValue) return;
    try {
      window.JsBarcode?.(previewRef.current, barcodeValue, {
        format: "CODE128",
        width: 2,
        height: 64,
        displayValue: true,
        fontSize: 13,
        textMargin: 4,
        margin: 8,
      });
    } catch {}
  }, [jsLoaded, selected, barcodeValue]);

  const handlePrint = () => {
    if (!selected || !barcodeValue) return;

    let storeName = "POS System";
    try {
      const raw = localStorage.getItem("pos_settings");
      if (raw) {
        const s = JSON.parse(raw) as { storeName?: string };
        if (s.storeName) storeName = s.storeName;
      }
    } catch {}

    const label = `
      <div class="label">
        <div class="store">${storeName}</div>
        <div class="name">${selected.name}</div>
        <svg class="bc"></svg>
        <div class="price">Rs. ${parseFloat(selected.price).toFixed(2)}</div>
        ${selected.sku ? `<div class="sku">SKU: ${selected.sku}</div>` : ""}
      </div>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Labels — ${selected.name}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <style>
    @page { size: A4; margin: 8mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #fff; }
    .grid { display: flex; flex-wrap: wrap; gap: 3mm; }
    .label {
      width: 62mm;
      border: 0.5px solid #bbb;
      border-radius: 2mm;
      padding: 3mm 3mm 2mm;
      text-align: center;
      page-break-inside: avoid;
    }
    .store  { font-size: 7px; color: #666; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 2px; }
    .name   { font-size: 10px; font-weight: 700; line-height: 1.2; margin-bottom: 3px; }
    .bc     { max-width: 100%; display: block; margin: 0 auto 2px; }
    .price  { font-size: 12px; font-weight: 900; color: #047857; margin-top: 2px; }
    .sku    { font-size: 7.5px; color: #999; margin-top: 1px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="grid">
    ${Array(copies).fill(label).join("")}
  </div>
  <script>
    window.addEventListener("load", function () {
      document.querySelectorAll(".bc").forEach(function (el) {
        JsBarcode(el, "${barcodeValue.replace(/"/g, '\\"')}", {
          format: "CODE128",
          width: 1.5,
          height: 38,
          displayValue: true,
          fontSize: 8,
          textMargin: 2,
          margin: 0
        });
      });
      setTimeout(function () { window.print(); }, 600);
    });
  </script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=720,height=950,scrollbars=yes");
    if (!win) { alert("Pop-up blocked — please allow pop-ups for this site."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <QrCode size={24} className="text-brand-600" /> {t.nav.barcodes}
        </h1>
        <p className="text-sm text-surface-400 mt-1">
          Generate and print barcode labels for your products
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product list */}
        <div className="card p-5">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              className="input pl-8"
              placeholder="Search by product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="overflow-auto max-h-[520px] space-y-0.5">
            {filtered?.length === 0 && (
              <p className="text-center py-10 text-sm text-surface-300">No products found</p>
            )}
            {filtered?.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  selectedId === p.id
                    ? "bg-brand-50 border border-brand-200"
                    : "hover:bg-surface-50"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-surface-800">{p.name}</p>
                  <p className="text-xs text-surface-400">
                    {p.sku ? `SKU: ${p.sku}` : <span className="italic">No SKU — auto ID used</span>}
                  </p>
                </div>
                <span className="text-xs font-bold text-brand-700 shrink-0">
                  Rs. {parseFloat(p.price).toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview + print options */}
        <div className="card p-5 space-y-5">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-72 text-surface-300">
              <Tag size={44} className="mb-3 opacity-25" />
              <p className="text-sm">Select a product to preview its barcode</p>
            </div>
          ) : (
            <>
              {/* Label preview */}
              <div className="border border-surface-200 rounded-xl p-5 bg-white text-center">
                <p className="text-[10px] text-surface-400 uppercase tracking-widest mb-2 font-semibold">Label Preview</p>
                <p className="text-sm font-bold text-surface-800 mb-3">{selected.name}</p>
                <svg ref={previewRef} className="mx-auto max-w-full" />
                <p className="text-lg font-black text-brand-700 mt-3">
                  Rs. {parseFloat(selected.price).toFixed(2)}
                </p>
                {selected.sku && (
                  <p className="text-xs text-surface-400 mt-1">SKU: {selected.sku}</p>
                )}
                {!selected.sku && (
                  <p className="text-xs text-amber-500 mt-1">
                    Auto-ID used (add a SKU in Products for a proper barcode)
                  </p>
                )}
              </div>

              {/* Copies picker */}
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-2 uppercase tracking-wider">
                  Number of Copies
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COPY_PRESETS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setCopies(n)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                        copies === n
                          ? "bg-brand-600 text-white"
                          : "bg-surface-100 text-surface-600 hover:bg-surface-200"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    max="200"
                    className="input w-20 text-sm"
                    value={copies}
                    onChange={(e) =>
                      setCopies(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))
                    }
                  />
                </div>
                <p className="text-xs text-surface-400 mt-1.5">
                  Labels print 4 per row on A4 · max 200 per sheet
                </p>
              </div>

              <button
                onClick={handlePrint}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                <Printer size={16} />
                Print {copies} Label{copies !== 1 ? "s" : ""}
              </button>

              {/* ── Test Scan Panel ── */}
              <div className="border-t border-surface-100 pt-4 space-y-2">
                <p className="text-xs font-semibold text-surface-600 uppercase tracking-wider flex items-center gap-1.5">
                  <ScanLine size={13} className="text-amber-600" /> Scan Simulator
                </p>
                <p className="text-xs text-surface-400">
                  Verify what a scanner will find when it reads this barcode.
                </p>

                {/* Auto-test selected product */}
                <div className={`flex items-center gap-2 p-2.5 rounded-lg text-xs border ${
                  selected?.sku
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}>
                  {selected?.sku
                    ? <><CheckCircle2 size={13} className="shrink-0" /> Barcode <code className="font-mono bg-white px-1 rounded">{barcodeValue}</code> → will add <strong>{selected.name}</strong> to cart</>
                    : <><XCircle size={13} className="shrink-0" /> No SKU set — auto-ID barcode won&apos;t be found at POS. Add a SKU in Products.</>
                  }
                </div>

                {/* Manual test input */}
                <form
                  onSubmit={(e) => { e.preventDefault(); handleTestScan(); }}
                  className="flex gap-2 mt-1"
                >
                  <input
                    className="flex-1 border border-surface-200 rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Type any barcode to look up…"
                    value={testBarcode}
                    onChange={(e) => { setTestBarcode(e.target.value); setScanResult(null); }}
                  />
                  <button
                    type="submit"
                    disabled={!testBarcode.trim()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    <ScanLine size={13} /> Test
                  </button>
                </form>

                {scanResult && (
                  <div className={`p-2.5 rounded-lg text-xs border flex items-start gap-2 ${
                    scanResult.found
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}>
                    {scanResult.found ? (
                      <>
                        <CheckCircle2 size={13} className="shrink-0 mt-0.5" />
                        <span>
                          Found: <strong>{scanResult.name}</strong> · LKR {parseFloat(scanResult.price).toFixed(2)}
                          {scanResult.sku && <> · SKU: <code className="font-mono">{scanResult.sku}</code></>}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle size={13} className="shrink-0 mt-0.5" />
                        <span>
                          No product found for <code className="font-mono">{scanResult.barcode}</code>
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
