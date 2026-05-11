# QuickPOS — Web-Based Point of Sale System

A modern POS system built with **Next.js 15 + tRPC + Drizzle + Neon + Supabase Realtime + Clerk + Stripe Terminal**.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| API | tRPC v11 |
| ORM | Drizzle ORM |
| Database | Neon (PostgreSQL) |
| Realtime | Supabase Realtime |
| Auth | Clerk |
| Payments | Stripe Terminal |

## Features

- 🛒 POS terminal with product grid + cart
- 📦 Product & category management
- 🧾 Order history with status tracking
- 📊 Daily reports dashboard
- 💳 Cash, card, and Stripe Terminal payments
- 🔒 Clerk authentication with role support
- ⚡ Real-time ready via Supabase
- 🗄️ Type-safe DB with Drizzle + Neon

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`:
- **Clerk**: Create a project at https://clerk.com
- **Neon**: Create a DB at https://neon.tech
- **Supabase**: Create a project at https://supabase.com
- **Stripe**: Get keys at https://stripe.com

### 3. Push DB schema

```bash
npm run db:push
```

### 4. Run development server

```bash
npm run dev
```

Open http://localhost:3000

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── pos/          # POS terminal
│   │   ├── products/     # Product management
│   │   ├── orders/       # Order history
│   │   └── reports/      # Daily reports
│   └── api/
│       ├── trpc/         # tRPC handler
│       └── stripe/       # Stripe webhook & payment intents
├── components/
│   ├── pos/              # Cart context, ProductGrid, CartPanel
│   └── providers.tsx     # tRPC + React Query providers
├── server/
│   ├── db/               # Drizzle schema + Neon client
│   ├── routers/          # tRPC routers (products, orders)
│   └── trpc.ts           # tRPC init + context
└── lib/
    ├── trpc.ts           # Client-side tRPC
    └── supabase.ts       # Supabase client
```

## Database Commands

```bash
npm run db:generate   # Generate migration files
npm run db:migrate    # Run migrations
npm run db:push       # Push schema directly (dev)
npm run db:studio     # Open Drizzle Studio
```

## Extending

- **Multi-branch**: Add `branchId` to products/orders tables + Clerk org support
- **Receipts**: Add `@react-pdf/renderer` for PDF receipts
- **Thermal printing**: Add `node-escpos` for ESC/POS receipt printers
- **Kitchen display**: Use Supabase Realtime channels to push new orders
- **Barcode scanning**: Add `@ericblade/quagga2` for camera-based scanning
