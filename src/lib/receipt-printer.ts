// Receipt printer — generates a thermal-style invoice and opens a print window.
// Business details can be overridden via the BUSINESS constant below.

export const BUSINESS = {
  name: "Your Business Name",
  subtitle: "",
  address: "Your Address",
  tel: "0700000000",
  developer: "Developed By MOB Software Solutions",
  devContact: "+94 00 000 0000",
};

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  discount: number;
  amount: number;
}

export interface ReceiptData {
  orderNumber: string;
  date: Date;
  cashierName: string;
  customerName: string;
  paymentMethod: string;
  items: ReceiptItem[];
  itemDiscount: number;
  billDiscount: number;
  cardFee?: number;
  billAmount: number;
  paidAmount: number;
  balanceAmount: number;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pad(s: string, w: number, right = false) {
  const str = String(s);
  if (right) return str.padStart(w, " ");
  return str.padEnd(w, " ");
}

export function printReceipt(data: ReceiptData, size: "80mm" | "a4" = "80mm") {
  // Read live settings from localStorage so store name, address, phone and logo are always current
  let biz = { ...BUSINESS, logo: "" };
  try {
    const raw = localStorage.getItem("pos_settings");
    if (raw) {
      const s = JSON.parse(raw) as { storeName?: string; address?: string; phone?: string; logo?: string };
      if (s.storeName) biz.name    = s.storeName;
      if (s.address)   biz.address = s.address;
      if (s.phone)     biz.tel     = s.phone;
      if (s.logo)      biz.logo    = s.logo;
    }
  } catch {}

  const win = window.open("", "_blank", "width=420,height=750,scrollbars=yes");
  if (!win) {
    alert("Pop-up blocked. Please allow pop-ups for this site to print receipts.");
    return;
  }

  const dateStr = data.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timeStr = data.date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const methodLabel = data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1);

  const itemRows = data.items
    .map(
      (item) => `
      <tr class="item-name-row">
        <td colspan="4" class="item-name">${item.name}</td>
      </tr>
      <tr class="item-detail-row">
        <td>${fmt(item.quantity)}</td>
        <td class="num">${fmt(item.price)}</td>
        <td class="num">${item.discount}</td>
        <td class="num">${fmt(item.amount)}</td>
      </tr>`
    )
    .join("");

  const profit = data.billDiscount;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice #${data.orderNumber}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <style>
    @page {
      size: ${size === "a4" ? "A4" : "80mm auto"};
      margin: ${size === "a4" ? "15mm 20mm" : "4mm"};
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
      width: ${size === "a4" ? "100%" : "72mm"};
      max-width: ${size === "a4" ? "170mm" : "72mm"};
      margin: 0 auto;
      padding: ${size === "a4" ? "0" : "4mm"};
    }

    /* ── Header meta ── */
    .meta { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 8px; color: #555; }

    /* ── Logo block ── */
    .logo-wrap { text-align: center; margin-bottom: 6px; }
    .logo-circle {
      width: 54px; height: 54px; border-radius: 50%;
      background: #047857;
      display: inline-flex; align-items: center; justify-content: center;
      margin-bottom: 3px;
    }
    .logo-circle svg { display: block; }
    .logo-tag { font-size: 9px; font-weight: 700; color: #047857; letter-spacing: 1px; }

    /* ── Business info ── */
    .biz-name { text-align: center; font-size: 18px; font-weight: 900; margin-bottom: 2px; }
    .biz-address { text-align: center; font-size: 11px; font-weight: 700; margin-bottom: 1px; }
    .biz-tel { text-align: center; font-size: 11px; margin-bottom: 8px; }

    /* ── Order meta ── */
    .order-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px 4px; font-size: 10px; margin-bottom: 6px; }
    .order-grid .lbl { color: #555; }

    /* ── Dividers ── */
    hr { border: none; border-top: 1px dashed #aaa; margin: 5px 0; }
    hr.solid { border-top: 1px solid #000; }
    hr.thick { border-top: 2px solid #000; }

    /* ── Items table ── */
    .items { width: 100%; border-collapse: collapse; margin: 4px 0; }
    .items thead th { font-size: 10px; color: #666; font-weight: 600; padding: 2px 0; text-align: left; }
    .items thead th.num { text-align: right; }
    .items .item-name-row td { padding-top: 5px; }
    .item-name { font-weight: 700; font-size: 12px; }
    .items .item-detail-row td { font-size: 11px; padding-bottom: 3px; vertical-align: top; }
    .items td.num { text-align: right; }

    /* ── Summary ── */
    .summary { width: 100%; border-collapse: collapse; margin-top: 4px; }
    .summary td { padding: 2px 0; font-size: 11px; }
    .summary td.cur { text-align: right; white-space: nowrap; padding-right: 2px; width: 28px; }
    .summary td.amt { text-align: right; white-space: nowrap; width: 64px; }
    .summary tr.total td { font-size: 14px; font-weight: 900; padding: 4px 0; }
    .summary tr.sep td { padding: 0; }
    .summary tr.sep td hr { margin: 3px 0; }

    /* ── Footer ── */
    .footer { text-align: center; margin-top: 10px; }
    .footer .thanks { font-size: 14px; font-weight: 700; margin-bottom: 3px; }
    .footer .dev { font-size: 9px; color: #555; }

    /* ── Barcode ── */
    .barcode-wrap { text-align: center; margin: 12px 0 6px; }
    .barcode-wrap svg { max-width: 100%; }
    .barcode-wrap .barcode-lbl { font-size: 9px; color: #555; margin-top: 2px; letter-spacing: 0.5px; }

    /* Print helper */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <div class="meta">
    <span>${dateStr}, ${timeStr}</span>
    <span>Invoice</span>
  </div>

  <div class="logo-wrap">
    ${biz.logo
      ? `<img src="${biz.logo}" alt="logo" style="width:64px;height:64px;object-fit:contain;display:block;margin:0 auto 4px;" />`
      : `<div class="logo-circle">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    </div>`}
    ${BUSINESS.subtitle ? `<div class="logo-tag">${BUSINESS.subtitle}</div>` : ""}
  </div>

  <div class="biz-name">${biz.name}</div>
  <div class="biz-address">${biz.address}</div>
  <div class="biz-tel">Tel : ${biz.tel}</div>

  <hr class="solid" />

  <div class="order-grid">
    <span><span class="lbl">Bill No:</span> ${data.orderNumber}</span>
    <span><span class="lbl">Cashier:</span> ${data.cashierName}</span>
    <span><span class="lbl">Customer:</span> ${data.customerName}</span>
    <span><span class="lbl">Method:</span> ${methodLabel}</span>
    <span><span class="lbl">Date:</span> ${dateStr}</span>
    <span><span class="lbl">Time:</span> ${timeStr}</span>
  </div>

  <hr class="solid" />

  <table class="items">
    <thead>
      <tr>
        <th>Product</th>
        <th class="num">Price</th>
        <th class="num">Dis</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <hr class="solid" />

  <table class="summary">
    <tr>
      <td>Total Item:</td>
      <td class="num">${data.items.length}</td>
    </tr>
    <tr class="total">
      <td>Total Amount:</td>
      <td class="cur">Rs.</td>
      <td class="amt">${fmt(data.billAmount)}</td>
    </tr>
    <tr>
      <td>Bill Discount:</td>
      <td class="cur">Rs.</td>
      <td class="amt">${fmt(data.billDiscount)}</td>
    </tr>
    ${data.cardFee ? `<tr>
      <td>Card Fee (3%):</td>
      <td class="cur">Rs.</td>
      <td class="amt">${fmt(data.cardFee)}</td>
    </tr>` : ""}
    <tr>
      <td>Bill Amount:</td>
      <td class="cur">Rs.</td>
      <td class="amt">${fmt(data.billAmount)}</td>
    </tr>
    <tr>
      <td>Paid Amount:</td>
      <td class="cur">Rs.</td>
      <td class="amt">${fmt(data.paidAmount)}</td>
    </tr>
    <tr>
      <td>Balance Amount:</td>
      <td class="cur">Rs.</td>
      <td class="amt">${fmt(data.balanceAmount)}</td>
    </tr>
    <tr class="sep"><td colspan="3"><hr class="thick" /></td></tr>
  </table>

  <div class="barcode-wrap">
    <svg id="receipt-barcode"></svg>
    <div class="barcode-lbl">Bill No: ${data.orderNumber}</div>
  </div>

  <div class="footer">
    <div class="thanks">Thank You Come Again!</div>
    <div class="dev">${BUSINESS.developer}</div>
    <div class="dev">${BUSINESS.devContact}</div>
  </div>

  <script>
    (function () {
      function renderBarcode() {
        if (typeof JsBarcode !== 'undefined') {
          JsBarcode('#receipt-barcode', '${data.orderNumber}', {
            format: 'CODE128',
            width: ${size === 'a4' ? 2 : 1.5},
            height: ${size === 'a4' ? 60 : 42},
            displayValue: false,
            margin: 0
          });
        }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderBarcode);
      } else {
        renderBarcode();
      }
    })();
  </script>

</body>
</html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
  // Delay lets the browser render & JsBarcode CDN load before triggering print
  setTimeout(() => {
    win.print();
  }, 800);
}
