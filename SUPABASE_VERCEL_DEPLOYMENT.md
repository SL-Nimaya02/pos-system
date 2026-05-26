# Supabase + Vercel Deployment Checklist

This guide walks you through migrating your POS system from MySQL/Docker to Supabase (PostgreSQL) + Vercel Cloud.

## Phase 1: Setup Supabase Project

### 1.1 Create Supabase Account & Project
- [ ] Go to [supabase.com](https://supabase.com)
- [ ] Sign up or log in
- [ ] Create a new project (pick a region close to your users)
- [ ] Save the **Supabase URL** and **Anon Key** from Project Settings → API
- [ ] Create a **Service Role Key** from the same page (for server-side operations)
- [ ] Database name is typically `postgres`; password is auto-generated

### 1.2 Enable Storage Bucket
- [ ] Go to **Storage** → Create new bucket → name it `product-images`
- [ ] Set it to **Public** (so images load without auth)
- [ ] Note the bucket endpoint (usually `https://<project-id>.supabase.co/storage/v1/object/public/product-images`)

---

## Phase 2: Database Migration (MySQL → PostgreSQL)

### 2.1 Export MySQL Data (Local)
```powershell
# If using docker-compose, dump the current MySQL database
docker-compose exec mysql mysqldump -u root -proot pos_db > mysql_backup.sql
```

### 2.2 Prepare PostgreSQL Schema
- [ ] Two schema files exist:
  - `src/server/db/schema.postgres.ts` ← **Use this** for Supabase
  - `src/server/db/schema.ts` ← Your current MySQL schema (for reference)

### 2.3 Migrate Data to Supabase
**Option A: Auto-migration via Drizzle (Recommended)**
```powershell
# 1. Update .env.local with Supabase credentials
#    DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres?sslmode=require

# 2. Install postgres-js
npm install postgres

# 3. Update drizzle.config.ts to point to schema.postgres.ts
#    (or use drizzle.config.postgres.ts)

# 4. Generate and apply migrations
npm run db:generate -- --name "initial_schema"
npm run db:push

# 5. Verify schema in Supabase dashboard (SQL Editor)
```

**Option B: Manual SQL Migration (if needed)**
1. Export schema from MySQL:
   ```sql
   mysqldump -u root -p --no-data pos_db > schema_only.sql
   ```
2. Open [Supabase SQL Editor](https://supabase.com/dashboard) and manually port tables
3. Update enum types to PostgreSQL syntax (e.g., `ENUM('open','closed')` → `CREATE TYPE ... AS ENUM`)

### 2.4 Import Data (Optional: if you need historical data)
- [ ] Use Supabase Data Import tool or custom scripts
- [ ] Verify row counts and key relationships post-import
- [ ] Test critical queries (orders, inventory, etc.)

---

## Phase 3: Update Application Code

### 3.1 Install PostgreSQL Driver
```powershell
npm install postgres
```

### 3.2 Update Database Connection
Choose **one** of these approaches:

**Approach A: Replace index.ts entirely**
```powershell
# Backup original
mv src/server/db/index.ts src/server/db/index.mysql.ts

# Use new PostgreSQL version
cp src/server/db/index.postgres.ts src/server/db/index.ts
```

**Approach B: Keep both and auto-detect (advanced)**
- Update `src/server/db/index.ts` to handle both MySQL and PostgreSQL
- The included `index.postgres.ts` already does this — use as reference

### 3.3 Update Drizzle Config
```powershell
# Option: Use the auto-detect config
cp drizzle.config.postgres.ts drizzle.config.ts
```
Or manually update `drizzle.config.ts`:
```typescript
const isPostgres = !!process.env.DATABASE_URL;
export default {
  schema: isPostgres ? "./src/server/db/schema.postgres.ts" : "./src/server/db/schema.ts",
  dialect: isPostgres ? "postgresql" : "mysql",
  // ... rest of config
};
```

### 3.4 Image Storage Setup
Ensure `.env.local` has Supabase storage:
```env
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY]
SUPABASE_SERVICE_KEY=[SERVICE-ROLE-KEY]
SUPABASE_BUCKET=product-images
```

If **Cloudinary is preferred** instead of Supabase storage:
```env
CLOUDINARY_CLOUD_NAME=[your-cloud-name]
CLOUDINARY_API_KEY=[your-api-key]
CLOUDINARY_API_SECRET=[your-api-secret]
```

---

## Phase 4: Prepare for Vercel Deployment

### 4.1 Create `vercel.json` (if not present)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

### 4.2 Prepare Environment Variables for Vercel
Create a `.env.production` (do NOT commit secrets; use Vercel dashboard):
```env
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT-ID].supabase.co:5432/postgres?sslmode=require

# NextAuth
NEXTAUTH_SECRET=[generate-strong-random-string]
NEXTAUTH_URL=https://[YOUR-VERCEL-DOMAIN].vercel.app

# Supabase (optional if using for storage/backups)
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON-KEY]
SUPABASE_SERVICE_KEY=[SERVICE-ROLE-KEY]
SUPABASE_BUCKET=product-images

# Stripe (optional)
STRIPE_SECRET_KEY=[your-stripe-key]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[your-stripe-public-key]
```

### 4.3 Test Locally with Supabase
```powershell
# Set DATABASE_URL in .env.local and test locally first
npm run dev

# Verify:
# - Database queries work
# - Image upload/storage works
# - Auth still functions
```

---

## Phase 5: Deploy to Vercel

### 5.1 Push Code to GitHub
```powershell
git add .
git commit -m "Migrate to Supabase + PostgreSQL"
git push origin main
```

### 5.2 Deploy via Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **Add New Project**
3. Import your GitHub repo
4. Select root directory (if in monorepo)
5. Click **Environment Variables** and add all variables from `.env.production`
6. Click **Deploy**

### 5.3 Vercel Build & Deployment
- [ ] Build completes successfully (check Vercel logs)
- [ ] No database connection errors in logs
- [ ] **IMPORTANT**: If using Supabase, Vercel will auto-detect PostgreSQL and allow persistent connections ✓

### 5.4 Post-Deployment Checks
```powershell
# Visit: https://[your-app].vercel.app

# Test:
- [ ] Login page loads
- [ ] Dashboard appears
- [ ] Orders can be created
- [ ] Products can be viewed
- [ ] Image uploads work (Supabase or Cloudinary)
- [ ] Audit logs record actions
```

---

## Phase 6: Data Sync & Cutover (if applicable)

### 6.1 If Running Parallel (Old MySQL + New Supabase)
- [ ] Keep Docker MySQL running for reads during transition
- [ ] Gradually migrate traffic to Vercel/Supabase
- [ ] Monitor error logs in Vercel for any compatibility issues

### 6.2 Final Cutover
- [ ] Take a final MySQL backup
- [ ] Switch all users to Vercel URL
- [ ] Monitor for 24–48 hours
- [ ] Archive old MySQL data (optional)

---

## Phase 7: Maintenance & Backups

### 7.1 Supabase Backups
- [ ] Supabase auto-backups daily (retention: 7 days for free tier)
- [ ] Set up manual backup trigger or use Supabase CLI:
  ```powershell
  npm install -g supabase
  supabase projects download <project-ref>
  ```

### 7.2 Automated Backups to Cloud Storage
- [ ] Optional: Set up backup to Supabase Storage or S3 via a Vercel cron job
- [ ] Use the existing backup script in `src/scripts/backup.ts`

### 7.3 Monitoring
- [ ] Check Supabase dashboard for connection pooling warnings
- [ ] Monitor Vercel deployment logs for errors
- [ ] Set up alerts for database size/usage

---

## Troubleshooting

### Build Error: `Cannot find module 'postgres-js'`
```powershell
npm install postgres
npm run build
```

### Database Connection Fails at Runtime
- [ ] Verify `DATABASE_URL` is set in Vercel environment
- [ ] Check Supabase dashboard for connection status
- [ ] Ensure firewall/IP restrictions are not blocking Vercel IPs

### Schema Mismatch Errors
- [ ] Verify you're using `schema.postgres.ts` in `drizzle.config.ts`
- [ ] Regenerate migrations: `npm run db:generate`
- [ ] Check for deprecated MySQL-only syntax (e.g., `mysqlEnum` vs `pgEnum`)

### Image Upload Fails
- [ ] Confirm Supabase Storage bucket is Public
- [ ] Check `NEXT_PUBLIC_SUPABASE_URL` and keys are correct
- [ ] Verify bucket name matches `SUPABASE_BUCKET` env var

### Slow Queries
- [ ] Supabase free tier has 1 GB database limit; monitor usage
- [ ] Check for missing indexes on frequently queried columns
- [ ] Use `EXPLAIN ANALYZE` in Supabase SQL editor to profile

---

## Rollback Plan (if issues arise)

### Revert to MySQL + Docker
```powershell
# Restore original database connection
cp src/server/db/index.mysql.ts src/server/db/index.ts

# Restore original drizzle config
cp drizzle.config.mysql.ts drizzle.config.ts

# Restart Docker
docker-compose up -d

# Redeploy to Vercel (or revert deployment)
git revert HEAD
git push
```

---

## Additional Resources

- **Supabase Docs**: https://supabase.com/docs
- **Drizzle ORM PostgreSQL**: https://orm.drizzle.team/docs/get-started-postgresql
- **Vercel Environment Variables**: https://vercel.com/docs/projects/environment-variables
- **Next.js PostgreSQL**: https://nextjs.org/learn/dashboard-app/setting-up-your-database

---

## Quick Command Reference

```powershell
# Test local setup with Supabase
$env:DATABASE_URL = "postgresql://..."
npm run dev

# Generate migrations
npm run db:generate -- --name "my_change"

# Apply migrations
npm run db:push

# View database in Supabase dashboard
# https://supabase.com/dashboard

# View app in Vercel
# https://[app-name].vercel.app
```

---

**Last Updated**: May 25, 2026  
**Status**: Ready for production deployment
