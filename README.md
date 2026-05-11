# 🛒 POS System

A modern, full-featured **Point of Sale system** built with Next.js 15, tRPC, Drizzle ORM, and PostgreSQL (Neon). Designed for retail and F&B businesses with role-based access, real-time kitchen display, purchase order management, and Excel/PDF reporting.

---

## ✨ Features

### 🖥️ POS Terminal
- **Barcode scanner support** — USB HID scanners auto-search and add products by SKU
- Product grid with category filtering and search
- Cart with real-time quantity controls, discount field, tax calculation per item
- Cash and card payment with change calculation
- **Cart persists across navigation** (localStorage)
- Cart item count badge

### 📦 Inventory & Products
- Full product CRUD (name, SKU, price, cost, stock, tax rate, category)
- Low stock alerts with colour-coded badges
- Category management with custom colours
- GRN (Goods Received Note) — manual stock adjustment with reason logging

### 🚛 Suppliers & Purchase Orders
- Full supplier CRUD (contact details, notes)
- Purchase Order workflow: **Draft → Ordered → Received** (auto-increments stock on receive)
- Line-item selection with product picker and unit costs
- Status badges and per-PO total

### 🧾 Orders & Refunds
- Complete order history with line items
- **Refund any completed order** — restores stock atomically via DB transaction
- Order status: pending / processing / completed / cancelled / refunded

### 📊 Reports
- Date range filtering with presets (Today / Last 7 days / Last 30 days)
- Revenue, order count, average order, cash/card split
- **Export to Excel** (3-tab workbook: Summary, Orders, Line Items)
- **Print / Save as PDF** (print-optimised layout)

### 👩‍🍳 Kitchen Display System (KDS)
- Live order tickets for pending & processing orders
- Colour-coded by age: green (new) → amber (>8 min) → red (>15 min)
- **Start Preparing** and **Mark Ready** actions
- Auto-refreshes every 10 seconds

### 👥 User Management
- Admin can create, edit, and delete staff accounts
- Roles: **Admin** (full access) / **Cashier** (POS + Help only)
- Inline role change, password reset, enable/disable accounts

### 🔐 Authentication
- Credential-based login (email + password, bcrypt hashed)
- JWT session via NextAuth — no external auth service required
- Middleware enforces route-level role protection

---

## 🗂️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| API | tRPC v11 with SuperJSON |
| Database | PostgreSQL (Neon serverless) |
| ORM | Drizzle ORM |
| Auth | NextAuth v4 + bcryptjs |
| Styling | Vanilla CSS + Tailwind |
| UI Icons | Lucide React |
| Notifications | React Hot Toast |
| Excel Export | xlsx (SheetJS) |

---

## 🚀 Getting Started

### 1. Clone and install

```bash
git clone https://github.com/ministryofbrands/pos-system.git
cd pos-system
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in:

```env
# PostgreSQL (Neon)
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_SECRET=your-random-secret-here
NEXTAUTH_URL=http://localhost:3000
```

> Generate a secret: `openssl rand -base64 32`

### 3. Push database schema

```bash
npx drizzle-kit push
```

### 4. Seed demo data

```bash
# Seed products, categories, suppliers, purchase orders, and orders
npx tsx scripts/seed.ts

# Seed user accounts (admin + cashier)
npx tsx scripts/seed-users.ts
```

### 5. Run dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

---

## 🔑 Default Login Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@pos.lk` | `admin123` |
| **Cashier** | `cashier@pos.lk` | `cashier123` |

> ⚠️ Change these immediately in a production environment.

---

## 🗺️ Pages & Routes

| Route | Role | Description |
|---|---|---|
| `/login` | Public | Login page |
| `/pos` | All | POS terminal |
| `/dashboard` | Admin | Sales summary |
| `/products` | Admin | Product management |
| `/inventory` | Admin | Stock levels |
| `/grn` | Admin | Goods received |
| `/suppliers` | Admin | Supplier management |
| `/purchase-orders` | Admin | Purchase order workflow |
| `/reports` | Admin | Sales reports + export |
| `/customers` | Admin | Order history + refunds |
| `/kds` | Admin | Kitchen display system |
| `/users` | Admin | User management |
| `/settings` | Admin | Store settings |
| `/help` | All | Help & guide |

---

## 🗄️ Database Schema

### Core tables
- `categories` — product categories with colours
- `products` — SKU, price, cost, stock, tax rate, category
- `orders` + `order_items` — full order lifecycle

### Operations tables
- `suppliers` — supplier contact details
- `purchase_orders` + `purchase_order_items` — procurement workflow
- `grn_entries` — stock adjustment log

### Auth & future tables
- `pos_users` — local staff accounts with bcrypt passwords and roles
- `loyalty_accounts` — points and spend tracking _(schema ready)_
- `promotions` — discount/coupon rules _(schema ready)_
- `product_variants` — size/colour variants _(schema ready)_
- `locations` — multi-branch support _(schema ready)_

---

## 🔌 Hardware Integration (Stubs)

See [`src/lib/hardware.ts`](src/lib/hardware.ts) for integration stubs and implementation instructions:

| Hardware | Status |
|---|---|
| USB Barcode Scanner | ✅ Implemented (Web HID) |
| ESC/POS Thermal Printer | ⚙️ Stub (node-escpos or WebUSB) |
| Cash Drawer | ⚙️ Stub (via ESC/POS) |
| Stripe Terminal (card machine) | ⚙️ Stub (Stripe Terminal SDK) |
| Kitchen Display (real-time) | ⚙️ Stub (Supabase Realtime / Ably) |

---

## 📜 Scripts

```bash
npx drizzle-kit push         # Push schema to DB
npx drizzle-kit studio       # Open Drizzle Studio (DB GUI)
npx tsx scripts/seed.ts      # Seed all demo data
npx tsx scripts/seed-users.ts # Seed user accounts only
npm run dev                  # Development server
npm run build                # Production build
```

---

## 🔒 Production Checklist

- [ ] Change `NEXTAUTH_SECRET` to a strong random value
- [ ] Change all default passwords in user management
- [ ] Set `NEXTAUTH_URL` to your production domain
- [ ] Enable HTTPS (required for secure cookies)
- [ ] Set up proper DB connection pooling
- [ ] Remove or secure the seed scripts

---

## 📄 License

MIT © Ministry of Brands
