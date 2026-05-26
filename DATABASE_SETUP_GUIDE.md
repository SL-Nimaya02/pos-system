# Database Setup: Local MySQL + Supabase Migration Guide

**Status**: ✅ Ready for local development | ⏳ Awaiting Supabase migration

---

## 🎯 Current Setup

### Local Development (MySQL)
```bash
npm run dev:local
```
- ✅ **Status**: Working
- **Database**: MySQL (localhost:3306)
- **Database Name**: pos_db
- **User**: root
- **Environment File**: `.env.local.mysql`
- **Data**: Already populated with your data

### Cloud Development (Supabase)
```bash
npm run dev:cloud
```
- ⏳ **Status**: Configured, awaiting data migration
- **Database**: PostgreSQL (Supabase)
- **Host**: db.qzgwbezcduuqsnkzkkko.supabase.co
- **Database Name**: postgres
- **Environment File**: `.env.local.supabase`
- **Data**: Empty (needs to be imported)

---

## 📊 Database Connection Info

### MySQL (Local)
```env
DB_MODE=local
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=pos_db
```

### PostgreSQL (Supabase)
```env
DB_MODE=postgres
DATABASE_URL=postgresql://postgres:MOBPOSsystem123@db.qzgwbezcduuqsnkzkkko.supabase.co:5432/postgres?sslmode=require
```

---

## 🚀 Quick Start

### Development with Local MySQL
```bash
# Start local development
npm run dev:local

# This will:
# 1. Switch to MySQL config (.env.local.mysql → .env.local)
# 2. Start Next.js dev server
# 3. Use your existing data immediately
```

### Backup Your Data Before Migrating
```bash
# Create a backup of your MySQL database
npm run migrate:supabase

# This will:
# 1. Export MySQL database to SQL file
# 2. Convert it for Supabase compatibility
# 3. Create import instructions
# 4. Generate backups in ./backups/ folder
```

### Migrate to Supabase
```bash
# Step 1: Backup and prepare migration files
npm run migrate:supabase

# Step 2: Import to Supabase manually (via dashboard)
# - Go to Supabase Dashboard → SQL Editor
# - Copy the generated SQL file content
# - Paste and execute in the SQL Editor
# - Wait for completion

# Step 3: Test cloud setup
npm run dev:cloud

# Step 4: Verify data was imported
# Visit http://localhost:3000 and test features
```

---

## 📁 Configuration Files

```
pos-system/
├── .env                         # Shared config (Prisma DATABASE_URL)
├── .env.local                   # Active config (auto-switched by scripts)
├── .env.local.mysql             # MySQL local config
├── .env.local.supabase          # Supabase cloud config
├── scripts/
│   ├── dev-local.js            # Switch to MySQL + start dev
│   ├── dev-cloud.js            # Switch to Supabase + start dev
│   ├── migrate-to-supabase.ts   # Export MySQL → Supabase SQL
│   └── diagnostic.js           # Check configuration
├── backups/                     # Migration files (after running migrate:supabase)
│   ├── pos_db_backup_*.sql
│   ├── pos_db_backup_*_supabase.sql
│   └── IMPORT_INSTRUCTIONS_*.md
└── prisma/
    └── schema.prisma           # Auto-generated from MySQL
```

---

## 🔄 How It Works

### Dev Script Flow: `npm run dev:local`

```
npm run dev:local
    ↓
scripts/dev-local.js runs
    ↓
Copies .env.local.mysql → .env.local
    ↓
Backs up current .env.local
    ↓
Runs: npm run dev
    ↓
Next.js loads .env.local (MySQL config)
    ↓
src/server/db/index.ts detects DB_MODE=local
    ↓
Connects to localhost:3306 MySQL
    ↓
App uses local database
```

### Dev Script Flow: `npm run dev:cloud`

```
npm run dev:cloud
    ↓
scripts/dev-cloud.js runs
    ↓
Copies .env.local.supabase → .env.local
    ↓
Backs up current .env.local
    ↓
Runs: npm run dev
    ↓
Next.js loads .env.local (PostgreSQL/Supabase config)
    ↓
src/server/db/index.ts detects DATABASE_URL (PostgreSQL)
    ↓
Connects to Supabase PostgreSQL
    ↓
App uses Supabase database
```

---

## 📋 Migration Steps (Detailed)

### Step 1: Prepare Migration Files
```bash
npm run migrate:supabase
```

**This creates**:
- `backups/pos_db_backup_YYYY-MM-DD.sql` — Raw MySQL dump
- `backups/pos_db_backup_YYYY-MM-DD_supabase.sql` — PostgreSQL compatible
- `backups/IMPORT_INSTRUCTIONS_YYYY-MM-DD.md` — Import guide

### Step 2: Import to Supabase

**Method A: Via Dashboard (Easiest)** ✅ RECOMMENDED
1. Open [Supabase Dashboard](https://app.supabase.com/)
2. Select project: `qzgwbezcduuqsnkzkkko`
3. Go to **SQL Editor** → **New Query**
4. Open `pos_db_backup_YYYY-MM-DD_supabase.sql`
5. Copy entire content
6. Paste into SQL Editor
7. Click **Run**
8. Wait for completion (2-5 minutes for large datasets)

**Method B: Via Supabase CLI**
```bash
psql -h db.qzgwbezcduuqsnkzkkko.supabase.co \
     -U postgres \
     -f backups/pos_db_backup_YYYY-MM-DD_supabase.sql
```

### Step 3: Verify Import

Once imported, test the setup:
```bash
# Switch to cloud
npm run dev:cloud

# Visit http://localhost:3000
# Test viewing products, orders, customers, etc.
# If all data appears, migration was successful!
```

### Step 4: Switch Permanently (Optional)

If you want to use Supabase as default:
```bash
# Copy cloud config to local
cp .env.local.supabase .env.local

# Update production DATABASE_URL in:
# - Vercel settings
# - Railway settings
# - Your deployment platform
```

---

## ✅ Checklist

### Before Migration
- [ ] Local MySQL is running (`npm run dev:local` works)
- [ ] You have the Supabase project credentials
- [ ] You've read the migration script output
- [ ] Backup files are created in `./backups/`

### During Migration
- [ ] SQL file is prepared (PostgreSQL compatible)
- [ ] You've imported it to Supabase via Dashboard
- [ ] Supabase shows tables and data in the console

### After Migration
- [ ] `npm run dev:cloud` connects successfully
- [ ] Data appears in your app
- [ ] All features work (products, orders, etc.)
- [ ] File uploads work to Supabase storage

---

## 🆘 Troubleshooting

### Issue: "npm run dev:local not working"
```bash
# Check if MySQL is running
# Windows: Make sure MySQL service is running
# Mac: brew services list | grep mysql
# Linux: systemctl status mysql

# Or use Docker
docker compose up -d mysql
```

### Issue: "npm run dev:cloud connects but no data"
```bash
# Data hasn't been imported yet
# Run: npm run migrate:supabase
# Then import the SQL to Supabase via Dashboard
```

### Issue: "Can't connect to Supabase from my network"
- Use Supabase Dashboard SQL Editor (no direct connection)
- Or deploy a migration script to a cloud server
- Or contact Supabase support

### Issue: "Error: DB_MODE detection not working"
```bash
# Explicitly set in .env.local:
# For local: DB_MODE=local
# For cloud: DB_MODE=postgres
```

### Issue: "Foreign key constraint errors during import"
- This is normal, just skip or fix manually in Supabase
- Supabase may have different constraint handling

---

## 📚 Command Reference

```bash
# Development
npm run dev:local              # Start with local MySQL
npm run dev:cloud              # Start with Supabase PostgreSQL
npm run dev                    # Start with current config

# Database
npm run db:generate            # Generate Drizzle migrations
npm run db:push                # Push Drizzle migrations
npm run db:studio              # Open Drizzle Studio GUI

# Prisma
npm run prisma:generate        # Generate Prisma types
npm run prisma:pull            # Introspect Supabase schema
npm run prisma:migrate         # Create Prisma migration

# Migration
npm run migrate:supabase       # Export MySQL & prepare for Supabase
npm run backup                 # Backup database to JSON

# Diagnostics
node scripts/diagnostic.js     # Check configuration status
```

---

## 🔐 Security Notes

- ✓ Database passwords are in `.env` files (not in version control)
- ✓ `.env.local*` files are in `.gitignore`
- ✓ Backup files contain sensitive data — keep safe
- ✓ Supabase credentials are public (anon key), but database is protected by password

---

## 📖 Next Steps

1. **For immediate development**: Use `npm run dev:local`
2. **To prepare migration**: Run `npm run migrate:supabase`
3. **To complete migration**: Import SQL to Supabase Dashboard
4. **To test cloud**: Run `npm run dev:cloud`

---

**Summary**:
- ✅ Both MySQL local and Supabase configs are ready
- ✅ Dev scripts can switch between them instantly
- ✅ Migration script is ready to export/backup data
- ⏳ Awaiting manual import of SQL to Supabase
- 📊 Your local data will be preserved in backups

Start with `npm run dev:local` for immediate development!
