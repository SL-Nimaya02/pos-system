# How to Import to Supabase

## Method 1: Supabase Dashboard (Easiest)

1. Open [Supabase Dashboard](https://app.supabase.com/)
2. Select your project: **qzgwbezcduuqsnkzkkko**
3. Go to **SQL Editor** → **New Query**
4. Copy entire content from: `backups\pos_db_migration_2026-05-26.sql`
5. Paste into the SQL editor
6. Click **Run** button
7. Wait for completion (2-5 minutes for 363 records)

## Method 2: Supabase CLI

```bash
supabase start
supabase db pull
# Then paste the SQL into the editor
```

## Method 3: psql Command (Advanced)

```bash
psql postgresql://postgres:MOBPOSsystem123@db.qzgwbezcduuqsnkzkkko.supabase.co:5432/postgres -f backups\pos_db_migration_2026-05-26.sql
```

## After Import

1. Verify data in Supabase Dashboard
2. Run: `npm run dev:cloud`
3. Test your application
4. Check all features work correctly

## Troubleshooting

**If import fails:**
- Check network connectivity to Supabase
- Verify PostgreSQL credentials are correct
- Ensure tables exist in Supabase database
- Try importing smaller batches manually

**If data looks incorrect:**
- Check date/time formats in Supabase
- Verify ENUM types are correctly created
- Check JSON fields are properly formatted

---

Generated: 2026-05-26T04:53:00.932Z
