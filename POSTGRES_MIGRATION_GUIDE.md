# PostgreSQL & Supabase Migration Guide

## Overview

Your POS system is currently **MySQL-based** and runs locally via Docker. This guide explains the **new PostgreSQL schema** and **how to switch to Supabase + Vercel**.

---

## What Changed

### **New Files Created**

1. **`src/server/db/schema.postgres.ts`** — PostgreSQL schema (equivalent to MySQL schema.ts)
   - Changed `mysqlTable` → `pgTable`
   - Changed `mysqlEnum` → `pgEnum`
   - Changed `decimal()` → `numeric()` (PostgreSQL standard)
   - Changed `int()` → `integer()`
   - All table structures and relationships remain **identical**

2. **`src/server/db/index.postgres.ts`** — Database connection logic
   - Auto-detects PostgreSQL vs MySQL based on `DATABASE_URL` presence
   - Uses `postgres-js` for PostgreSQL connections (instead of mysql2)
   - Falls back to MySQL if `DATABASE_URL` is not set

3. **`drizzle.config.postgres.ts`** — Auto-detecting Drizzle config
   - Automatically selects correct schema (MySQL or PostgreSQL)
   - Selects correct dialect (mysql or postgresql)
   - Uses `DATABASE_URL` for cloud databases, individual vars for local

4. **`SUPABASE_VERCEL_DEPLOYMENT.md`** — Step-by-step deployment guide
   - Complete checklist from Supabase setup to Vercel deployment

5. **`package.json`** — Added `postgres` driver
   - `npm install postgres` enables PostgreSQL connections

---

## Decision Tree: Which Mode to Use?

```
Are you deploying to production?
  ├─ YES → Use Supabase + Vercel
  │        ├─ Set: DATABASE_URL=postgresql://[supabase-url]
  │        └─ Use: schema.postgres.ts, index.postgres.ts
  │
  └─ NO (Local Development)
     ├─ Using Docker + MySQL? → Keep current setup
     │  └─ Use: schema.ts, index.ts (no changes needed)
     │
     └─ Want to test PostgreSQL locally?
        ├─ Install Supabase CLI or use local PostgreSQL
        ├─ Set: DATABASE_URL=postgresql://...
        └─ Use: schema.postgres.ts, index.postgres.ts
```

---

## Quick Start: Migrate to Supabase

### **For Production (Vercel + Supabase)**

1. **Create Supabase Project**
   ```
   Go to supabase.com → Create Project → Copy DATABASE_URL
   ```

2. **Update `.env.local`** (or `.env.production` for Vercel)
   ```env
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT-ID].supabase.co:5432/postgres?sslmode=require
   NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY]
   SUPABASE_BUCKET=product-images
   NEXTAUTH_SECRET=[strong-random-string]
   NEXTAUTH_URL=https://[your-vercel-app].vercel.app
   ```

3. **Install PostgreSQL Driver**
   ```bash
   npm install postgres
   ```

4. **Replace Database Files**
   ```bash
   # Option A: Use the auto-detect config (recommended)
   cp drizzle.config.postgres.ts drizzle.config.ts
   cp src/server/db/index.postgres.ts src/server/db/index.ts

   # Option B: Keep both and let auto-detection handle it
   # (edit drizzle.config.ts to check DATABASE_URL presence)
   ```

5. **Run Migrations**
   ```bash
   npm run db:generate -- --name "initial_postgres_schema"
   npm run db:push
   ```

6. **Test Locally**
   ```bash
   npm run dev
   # Visit http://localhost:3000 → test orders, products, uploads
   ```

7. **Deploy to Vercel**
   ```bash
   git add .
   git commit -m "Migrate to Supabase PostgreSQL"
   git push origin main
   # In Vercel dashboard: add environment variables and deploy
   ```

---

### **For Local Development Only (No Change Needed)**

If you want to keep running locally with Docker MySQL:

```bash
# Keep everything as-is
docker-compose up -d
npm install
npm run dev

# Your existing code works without any changes
```

---

## Key Compatibility Notes

### **SQL Differences Between MySQL and PostgreSQL**

| Feature | MySQL | PostgreSQL | Status |
|---------|-------|------------|--------|
| Primary Key (UUID) | `VARCHAR(36)` | `VARCHAR(36)` | ✅ Same |
| Enum Type | `ENUM('a','b')` | `pgEnum` then column type | ✅ Handled |
| Decimals | `DECIMAL(10,2)` | `NUMERIC(10,2)` | ✅ Equivalent |
| Integer | `INT` | `INTEGER` | ✅ Same |
| Timestamp | `TIMESTAMP` | `TIMESTAMP` | ✅ Same |
| JSON | `JSON` | `JSON` | ✅ Same |
| Text Search | Case-insensitive LIKE | Case-sensitive by default | ⚠️ Minor (use ILIKE) |
| Foreign Keys | Supported | Supported | ✅ Same |
| Cascade Delete | Supported | Supported | ✅ Same |

### **Important: Connection Pooling**

- **Local (Docker MySQL)**: Direct connection, no pooling needed
- **Supabase**: Uses PgBouncer (connection pooling) — **no configuration needed**
- **Vercel + PostgreSQL**: Works seamlessly; Supabase handles pooling

---

## Verification Checklist

### **After Switching to PostgreSQL**

- [ ] **Database connects** without errors
  ```bash
  npm run dev  # Check console for DB connection logs
  ```

- [ ] **Schema exists** (check Supabase SQL Editor)
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public';
  ```

- [ ] **Core operations work**
  ```
  ✓ Create an order
  ✓ Add a product
  ✓ Upload an image
  ✓ View audit log
  ```

- [ ] **Enums are correct** (Supabase dashboard → Schemas)
  ```
  ✓ "orders_status_enum" exists
  ✓ "cash_register_sessions_status_enum" exists
  ```

---

## Troubleshooting

### **Error: "Cannot find module 'postgres'"**
```bash
npm install postgres
npm run dev
```

### **Error: "Unknown type 'pgEnum'..."**
- Ensure you're using `schema.postgres.ts` (not `schema.ts`)
- Check `drizzle.config.ts` has correct schema path

### **Error: "SSL connection required"**
- Supabase always requires SSL → auto-configured in `index.postgres.ts`
- Ensure `DATABASE_URL` ends with `?sslmode=require`

### **Query Errors: "relation does not exist"**
- Migrations haven't been run → execute `npm run db:push`
- Schema mismatch → verify table names and column types

### **Images Don't Upload**
- Check `NEXT_PUBLIC_SUPABASE_URL` and bucket name
- Ensure storage bucket is **Public** (not private)

---

## Side-by-Side Comparison

### **Local Development (Current)**
```
┌─────────────────┐
│   Your Machine  │
├─────────────────┤
│  Next.js (dev)  │
│      ↓          │
│  Docker MySQL   │ ← Data stored locally
│  (localhost)    │
│      ↓          │
│ Public/images   │ ← Images stored locally
└─────────────────┘
```

### **Production on Vercel + Supabase (New)**
```
┌──────────────────────────────────┐
│    Vercel (Hosting)              │
├──────────────────────────────────┤
│  Next.js (Production)            │
│      ↓                           │
│  Vercel Serverless Functions     │
└──────────────┬───────────────────┘
               │
        ┌──────┴──────┐
        ↓             ↓
    ┌────────┐  ┌──────────────────┐
    │Supabase│  │ Supabase Storage │
    │ Postgres │  │ (product-images) │
    └────────┘  └──────────────────┘
       (Cloud)        (CDN)
```

---

## Environment Variables Reference

### **Local (.env.local with MySQL)**
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=pos_db
NEXTAUTH_SECRET=local-secret
NEXTAUTH_URL=http://localhost:3000
```

### **Local (.env.local with Supabase/PostgreSQL)**
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY]
SUPABASE_BUCKET=product-images
NEXTAUTH_SECRET=dev-secret
NEXTAUTH_URL=http://localhost:3000
```

### **Production (.env.production for Vercel)**
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY]
SUPABASE_SERVICE_KEY=[SERVICE-ROLE-KEY]
SUPABASE_BUCKET=product-images
NEXTAUTH_SECRET=[STRONG-RANDOM-256-BIT-STRING]
NEXTAUTH_URL=https://[app-name].vercel.app
STRIPE_SECRET_KEY=[optional-stripe-key]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[optional-stripe-public-key]
```

---

## Next Steps

1. **For Production**: Follow [SUPABASE_VERCEL_DEPLOYMENT.md](./SUPABASE_VERCEL_DEPLOYMENT.md)
2. **For Local Testing**: Set `DATABASE_URL` in `.env.local` and run `npm run dev`
3. **Keep Standalone**: No changes needed; local Docker setup works as-is

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs/guides/database
- **Drizzle ORM (PostgreSQL)**: https://orm.drizzle.team/docs/get-started-postgresql
- **Vercel Environment Setup**: https://vercel.com/docs/projects/environment-variables
- **Next.js + Postgres Guide**: https://nextjs.org/learn/dashboard-app/setting-up-your-database

---

**Last Updated**: May 25, 2026  
**Status**: Ready for deployment
