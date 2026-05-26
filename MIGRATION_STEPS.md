# Complete MySQL → Supabase Migration Guide

This guide will migrate both **schema** and **data** from your local MySQL to Supabase PostgreSQL.

## Phase 1: Apply Schema to Supabase (Manual - Avoids Network Issues)

### Step 1: Copy Schema SQL
```powershell
# In PowerShell, the migration file is ready at:
# c:\Users\Shazna Salman\Downloads\pos-system\pos-system\drizzle\0000_windy_the_stranger.sql

# Display it:
Get-Content "drizzle\0000_windy_the_stranger.sql"

# Or copy to clipboard for easy pasting:
Get-Content "drizzle\0000_windy_the_stranger.sql" | Set-Clipboard
```

### Step 2: Paste into Supabase SQL Editor
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: **qzgwbezcduuqsnkzkkko**
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. **Paste** the schema SQL (from clipboard or copy-paste manually)
6. Click **Run** button (play icon)
7. Wait ~10 seconds for execution

**Expected output:**
```
Query succeeded ✓
```

### Step 3: Verify Schema
1. Go to **Schemas** in Supabase dashboard
2. Verify these tables exist:
   - ✅ categories
   - ✅ products
   - ✅ orders
   - ✅ employees
   - ✅ (and 30+ more)

---

## Phase 2: Migrate Data from MySQL to Supabase

### Prerequisites
- ✅ MySQL is running locally (Docker or native)
- ✅ Schema is created in Supabase (from Phase 1)
- ✅ Environment variables set in `.env.local` (already done)

### Run Data Migration Script

```powershell
# Navigate to project
cd "c:\Users\Shazna Salman\Downloads\pos-system\pos-system"

# Run the migration script
npx tsx scripts/migrate-mysql-to-supabase.ts
```

**Expected output:**
```
🚀 Starting data migration from MySQL to Supabase PostgreSQL...

📦 Connecting to MySQL...
✅ MySQL connected

🌐 Connecting to Supabase PostgreSQL...
✅ Supabase connected

🔧 Disabling foreign key constraints...
✅ Constraints disabled

📋 Migrating table data:

  ✅ categories: 15 rows migrated
  ✅ products: 250 rows migrated
  ✅ orders: 1000 rows migrated
  ✅ order_items: 3200 rows migrated
  ... (more tables)

✨ Data migration completed successfully!
```

### Troubleshooting

**Error: "connect ECONNREFUSED 127.0.0.1:3306"**
- MySQL is not running
- Start Docker with: `docker-compose up -d`
- Or start MySQL service locally

**Error: "getaddrinfo ENOTFOUND db.qzgwbezcduuqsnkzkkko.supabase.co"**
- Network issue with Supabase connection
- Check internet connectivity
- Verify `DATABASE_URL` in `.env.local` is correct

**Error: "Cannot find module 'postgres' or 'mysql2'"**
- Dependencies not installed
- Run: `npm install`

---

## Phase 3: Verify Migration

### Check Data in Supabase
1. Go to Supabase **SQL Editor**
2. Run verification queries:

```sql
-- Check row counts
SELECT 'products' as table_name, COUNT(*) as row_count FROM products
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'customers', COUNT(*) FROM customers;
```

### Test App Connection
```powershell
# Start development server
npm run dev

# Visit http://localhost:3000
# Try:
# - Login with NextAuth
# - Create an order
# - View products
# - Upload an image
```

---

## Summary

| Phase | Task | Status |
|-------|------|--------|
| 1 | ✅ Schema created in Supabase | Manual SQL execution |
| 2 | ⏳ Data migrated from MySQL | Run `migrate-mysql-to-supabase.ts` |
| 3 | ⏳ Verify data integrity | Check counts & test app |

---

## Next Steps After Migration

### For Local Development
```bash
# Your app now works with Supabase!
npm run dev
# Visit http://localhost:3000
```

### For Production Deploy
```bash
# Push to GitHub
git add .
git commit -m "Migrate MySQL to Supabase PostgreSQL"
git push origin main

# Deploy to Vercel (or any platform)
# Environment variables already set in .env.local
```

### Rollback (if needed)
```bash
# If issues, revert to MySQL local:
# 1. Comment out DATABASE_URL in .env.local
# 2. Restart with MySQL: docker-compose up -d
# 3. Run: npm run dev
```

---

## Quick Commands Reference

```powershell
# View migration status
npm run db:studio

# Generate new migrations after schema changes
npm run db:generate -- --name "my_change"

# Apply future migrations
npm run db:push

# Check current database connection
node -e "console.log(process.env.DATABASE_URL ? 'PostgreSQL (Supabase)' : 'MySQL (Local)')"
```

---

**Need help?** Check:
- Supabase docs: https://supabase.com/docs
- Drizzle ORM: https://orm.drizzle.team
- Migration troubleshooting: See Phase 2 Troubleshooting above
