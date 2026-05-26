# Supabase Connection Troubleshooting Guide

## Problem
- ❌ `getaddrinfo ENOTFOUND db.qzgwbezcduuqsnkzkkko.supabase.co` errors
- ❌ 401 Unauthorized during auth login
- ❌ Can't connect to Supabase database from Node.js

## Root Cause
Your network configuration doesn't support IPv6 connections, but Supabase's direct database endpoint only provides IPv6 DNS records.

## Solutions (in order of preference)

### ✅ **SOLUTION 1: Use Supabase Connection Pooler (RECOMMENDED)**

The Connection Pooler has better IPv4 support and is ideal for hosting/cloud deployments.

**Steps:**

1. **Get your Connection Pooler URL:**
   - Go to https://app.supabase.com
   - Select your project
   - Click **Settings** → **Database**
   - Find section **Connection strings**
   - Copy the **"Connection string"** (NOT the "URI")
   - It should look like: `postgresql://postgres:XXXXX@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require`

2. **Update `.env.local.supabase`:**
   ```bash
   # Replace with your actual pooler URL
   DATABASE_URL=postgresql://postgres:MOBPOSsystem123@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```

3. **Test the connection:**
   ```bash
   npm run dev:cloud
   ```

**Why this works:**
- Connection Pooler has IPv4 endpoints available
- Better for distributed/serverless deployments
- More reliable for production hosting

---

### ⚙️ **SOLUTION 2: Try IPv4-First DNS Strategy**

If you want to keep using the direct connection, try forcing IPv4:

```bash
npm run dev:cloud:ipv4
```

**Note:** This may not work if your ISP/network truly doesn't support IPv6.

---

### 🔧 **SOLUTION 3: Manual Environment Configuration**

If neither above works, manually test with:

```bash
# PowerShell syntax
$env:NODE_OPTIONS="--dns-result-order=ipv4first"
$env:DATABASE_URL="postgresql://postgres:MOBPOSsystem123@YOUR_POOLER_HOST:6543/postgres?sslmode=require"
npm run dev
```

---

## ✅ What I've Already Fixed

- ✓ Updated `NEXTAUTH_SECRET` to a cryptographically secure key
- ✓ Updated both `.env.local` and `.env.local.supabase` with the new secret
- ✓ Added helper scripts for different DNS strategies
- ✓ Added `npm run dev:cloud:ipv4` and `npm run dev:cloud:ipv6` commands

---

## 🚀 For Production/Hosting Deployment

When deploying to Vercel, Railway, or other hosting platforms:

1. **Use Connection Pooler URL** in DATABASE_URL
2. Set these environment variables:
   ```
   DATABASE_URL=postgresql://postgres:PASSWORD@pooler.supabase.com:6543/postgres?sslmode=require
   NEXTAUTH_SECRET=863d09e6f105a16f2663c74f84eced0687ced3eaa60a99b8fe77cc0a3b0a0536
   NEXTAUTH_URL=https://yourdomain.com
   ```

3. The Connection Pooler handles:
   - ✓ Better IPv4 support
   - ✓ Connection reuse/optimization
   - ✓ Automatic failover
   - ✓ Better performance under load

---

## 🧪 Testing Connection

Run the test scripts:

```bash
# Test connection options
npx tsx scripts/supabase-connection-options.ts

# Test IPv6 connection
npx tsx scripts/test-ipv6.ts

# Diagnose auth issues
npx tsx scripts/diagnose-auth-issues.ts
```

---

## ❓ Need More Help?

1. **Check Supabase Status:** https://status.supabase.com
2. **Check your Firewall:** Ensure port 5432/6543 isn't blocked
3. **Verify credentials:** Double-check password in Supabase dashboard
4. **Network test:** Run `ping` and `nslookup` to test DNS
5. **Use local for now:** `npm run dev:local` works with your local MySQL

---

## 📝 Next Steps

1. Go to Supabase dashboard and copy your Connection Pooler URL
2. Update `.env.local.supabase` with the pooler URL
3. Run `npm run dev:cloud`
4. If auth still fails, check app.ts in src/lib/auth.ts for additional config

Good luck! 🚀
