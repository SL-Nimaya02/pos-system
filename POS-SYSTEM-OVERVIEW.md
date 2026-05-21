# POS System — Complete Overview

## System Architecture

**Stack**: Next.js 15 (App Router) + tRPC v11 + Drizzle ORM + MySQL 8 + NextAuth v4 + Stripe + Tailwind CSS

**Languages**: English / Sinhala / Tamil (i18n via flat key files in `src/lib/i18n/`)

---

## Data Flow (Big Picture)

```
Browser
  └── tRPC Client (httpBatchLink + superjson)
        └── /api/trpc/[trpc]
              └── tRPC Router (_app.ts)
                    ├── products / variants / categories
                    ├── orders
                    ├── cashRegister
                    ├── suppliers / purchaseOrders / grn
                    ├── finance / balanceSheet
                    ├── loyalty
                    ├── users / settings / batches
                    └── Drizzle → MySQL 8
```

---

## Pages & What They Do

| Route | Purpose |
|---|---|
| `/` | Redirects to `/pos` |
| `/login` | NextAuth credentials login |
| `/pos` | **Main POS terminal** |
| `/dashboard` | KPI cards, charts, analytics |
| `/orders` | Order history + filters |
| `/products` | Product CRUD + variants |
| `/inventory` | Stock velocity, FEFO batches, write-offs |
| `/grn` | Receive goods, auto-increment stock |
| `/suppliers` | Supplier ledger, cheque tracking |
| `/purchase-orders` | PO lifecycle (draft → received) |
| `/cash-register` | Session open/close, cash movements |
| `/finance` | Expenses, income, P&L, cash flow |
| `/reports` | P&L report + Excel export |
| `/customers` | Loyalty accounts, point adjustments |
| `/users` | Staff CRUD, roles |
| `/settings` | Store details, language |
| `/returns` | Per-item refunds with stock restore |
| `/barcodes` | Label printing (stub) |
| `/kds` | Kitchen display (stub) |
| `/help` | Help docs |

---

## POS Terminal Checkout Flow

```
1. Cashier opens /pos
2. Product grid loads (all products + variants via trpc.products.list)
3. Cashier clicks product
   ├── Has variants? → Variant Picker Modal → handleAddVariant()
   └── No variants?  → handleAdd() → cart
4. Cart Panel shows items, qty controls, line totals
5. Optional:
   ├── Promo code  → trpc.orders.validatePromo
   ├── Loyalty phone → trpc.loyalty.lookup → redeem points
   ├── Hold order  → saved to localStorage
   └── Custom item → free or paid
6. Select payment method
   ├── cash → enter cash received → calculate change
   ├── card / credit_card / debit_card
   │     └── (if Stripe key set) → POST /api/stripe/payment-intent
   │                               → get intentId → store on order
   └── cheque
7. handlePay() → trpc.orders.create
   ├── Validates promo server-side
   ├── Decrements stock per item
   ├── Earns loyalty points (1 pt / LKR)
   ├── Generates order number: ORD-YYYYMMDD-####
   └── Returns order
8. Optional: print receipt (80mm thermal or A4)
9. Cart cleared
```

---

## tRPC Routers & Key Procedures

| Router | Key Procedures |
|---|---|
| `products` | `list`, `create`, `update`, `delete`, `adjustStock`, `lowStock` |
| `categories` | `list`, `create`, `update`, `delete` |
| `variants` | `list`, `create`, `update`, `delete`, `adjustStock` |
| `orders` | `create`, `list`, `getById`, `validatePromo`, `refund`, `partialRefund`, `summary`, `weeklyRevenue`, `topProducts`, `paymentBreakdown`, `hourlyOrders`, `pnl` |
| `cashRegister` | `getActive`, `openSession`, `addMovement`, `closeSession`, `listSessions`, `todayLog` |
| `suppliers` | `list`, `create`, `update`, `delete`, `listTransactions`, `addTransaction` |
| `purchaseOrders` | `list`, `create`, `updateStatus`, `delete` |
| `grn` | `list`, `create` (auto-increments stock + FEFO batch) |
| `finance` | `listExpenses`, `listIncome`, `addExpense`, `addIncome`, `cashFlow`, `totals` |
| `balanceSheet` | `list`, `create`, `update`, `delete` |
| `loyalty` | `lookup`, `create`, `list`, `adjustPoints` |
| `batches` | `listAll`, `listByProduct`, `listExpiring`, `writeOff` |
| `users` | `list`, `create`, `updateRole`, `resetPassword`, `toggleActive` |
| `settings` | `getAll`, `upsertMany`, `get` |

---

## Database (20+ Tables)

### Commerce
| Table | Key Columns |
|---|---|
| `products` | id, name, SKU, price, cost, stock, category_id, tax_rate, reorder_threshold, is_active |
| `categories` | id, name, color |
| `product_variants` | id, product_id, name, value, price_diff, stock, SKU, barcode, is_active |
| `orders` | id, order_number, status, subtotal, tax, discount, total, payment_method, stripe_payment_intent_id, loyalty_phone, session_id |
| `order_items` | id, order_id, product_id, product_name, product_price, quantity, subtotal |

### Inventory
| Table | Key Columns |
|---|---|
| `stock_batches` | id, product_id, batch_number, expiry_date, quantity_received, quantity_remaining, unit_cost |
| `goods_receipts` | id, grn_number, supplier_id, supplier_invoice_no, received_date, received_by |
| `goods_receipt_items` | id, grn_id, product_id, quantity_received, unit_cost, batch_number, expiry_date, condition |

### Procurement
| Table | Key Columns |
|---|---|
| `suppliers` | id, name, contact_name, phone, email, tier, is_active |
| `supplier_transactions` | id, supplier_id, type, amount, cheque_number, cheque_status |
| `purchase_orders` | id, po_number, supplier_id, status, total_amount, expected_date |
| `purchase_order_items` | id, purchase_order_id, product_id, quantity, unit_cost |

### Register & Finance
| Table | Key Columns |
|---|---|
| `cash_register_sessions` | id, opened_by, opening_float, actual_cash, cash_sales, card_sales, status |
| `cash_movements` | id, session_id, type, amount, reason |
| `financial_entries` | id, type (income/expense), amount, category, date |
| `balance_sheet_accounts` | id, name, type (asset/liability/capital), category, balance |
| `promotions` | id, code, type (percentage/fixed), value, min_order_amount, max_uses, expires_at |

### Loyalty & System
| Table | Key Columns |
|---|---|
| `loyalty_accounts` | id, phone (unique), name, points, total_spend |
| `loyalty_transactions` | id, loyalty_account_id, order_id, type (earn/redeem), points |
| `pos_users` | id, name, email, password_hash, role (admin/cashier), is_active |
| `system_settings` | id, key (unique), value |
| `locations` | id, name, address, phone, is_active |

---

## Auth & Access Control

- **Auth**: NextAuth v4, Credentials provider, bcrypt passwords, JWT sessions
- **Roles**: `admin` and `cashier`
- **Middleware** (`src/middleware.ts`): Admin-only routes redirect cashiers back to `/pos`
  - Admin-only: `/dashboard`, `/products`, `/inventory`, `/grn`, `/reports`, `/suppliers`, `/purchase-orders`, `/customers`, `/users`
- **Role Context**: `useRole()` hook exposes `isAdmin`, `role`, `userName` to all components

---

## Component Tree

```
app/layout.tsx
  └── Providers (SessionProvider → tRPC → Language → Role)
        └── (dashboard)/layout.tsx
              ├── Sidebar
              │     ├── NavLinks (role-filtered)
              │     └── LanguageSwitcher
              └── Page Content
                    └── (dashboard widgets, charts, forms)

POS Terminal (pos-terminal.tsx)
  ├── CartContext (useReducer, localStorage persist)
  ├── ProductGrid — search + category tabs + product cards
  ├── CartPanel  — item list + qty controls + checkout
  ├── Variant Picker Modal
  ├── Scanner Modal (USB HID keyboard wedge input)
  └── Receipt Modal → receipt-printer.ts → window.print()
```

---

## Key Components

### `src/components/pos/pos-terminal.tsx`
Main POS interface. Manages:
- Product search + barcode scanning (USB HID keyboard wedge)
- Variant picker modal (opens when a product has variants)
- Promo code + loyalty points flows
- Payment method selection (cash / card / cheque / Stripe)
- `handlePay()` — creates Stripe PaymentIntent for card payments, then calls `trpc.orders.create`
- Held orders (localStorage)
- Receipt printing

### `src/components/pos/cart-context.tsx`
React Context + useReducer for cart state.
- Actions: `ADD_ITEM`, `REMOVE_ITEM`, `UPDATE_QTY`, `SET_DISCOUNT`, `CLEAR`
- Cart key for variants: `${productId}__v__${variantId}`
- Auto-saves to `localStorage["pos_cart"]`

### `src/components/pos/product-grid.tsx`
Product display with real-time search + category filter tabs.

### `src/components/pos/cart-panel.tsx`
Cart item list, qty controls, totals, checkout trigger.

### `src/components/dashboard-widgets.tsx`
Reusable chart + KPI components:
- `KpiCard` — icon + value + trend
- `RevenueAreaChart` — Chart.js area chart
- `CashFlowChart` — multi-line chart
- `DonutChart` — payment method breakdown
- `HorizBarChart` — top products
- `HourlyRadar` — 24-hour order radar

### `src/components/sidebar.tsx`
Collapsible sidebar with nav links, language switcher, user badge, sign-out.

---

## Key Library Files

| File | Purpose |
|---|---|
| `src/lib/auth.ts` | NextAuth config (Credentials, bcrypt, JWT, role in token) |
| `src/lib/trpc.ts` | tRPC React client (httpBatchLink, superjson) |
| `src/lib/receipt-printer.ts` | Generates thermal/A4 receipt HTML (reads store details from localStorage) |
| `src/lib/hardware.ts` | Stubs: ESC/POS printer, cash drawer, Stripe Terminal, barcode label printer, KDS push |
| `src/lib/i18n/en.ts` | English translation keys (master) |
| `src/lib/i18n/si.ts` | Sinhala translations |
| `src/lib/i18n/ta.ts` | Tamil translations |

---

## Key Design Patterns

| Pattern | Detail |
|---|---|
| No `.returning()` | MySQL limitation — pre-generate UUIDs, then query back |
| Soft deletes | `isActive = false` on products, variants, users |
| Stock arithmetic | `sql\`stock + ${qty}\`` for safe concurrent increments |
| Variant cart key | `${productId}__v__${variantId}` — same product, different variants = separate lines |
| Receipt data | Reads `localStorage["pos_settings"]` for store name/address/logo at print time |
| Stripe flow | Creates PaymentIntent → stores `stripePaymentIntentId` on order → reconciliation-style (physical terminal assumed for actual card capture) |
| FEFO batches | Stock batches ordered by `expiry_date ASC` (nulls last) for First Expiry First Out |
| Order numbers | Generated as `ORD-YYYYMMDD-####`, GRN as `GRN-YYYYMMDD-####`, PO as `PO-YYYYMMDD-####` |
| Promo validation | Server-side in `orders.create` — checks expiry, usage count, min order amount |
| Loyalty points | Earned at 1 pt / LKR spent, redeemed at checkout, logged in `loyalty_transactions` |
