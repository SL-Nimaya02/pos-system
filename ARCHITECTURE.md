# POS System — Database Architecture Diagram

## 🎯 Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    npm run dev:local                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ├─► scripts/dev-local.js
                        │   • Copies .env.local.mysql → .env.local
                        │   • Backs up current .env.local
                        │   • Runs: npm run dev
                        │
                        └─► .env.local (ACTIVE)
                            DB_MODE=local
                            DB_HOST=localhost
                            DB_PORT=3306
                            DB_USER=root
                            DB_PASSWORD=root
                            DB_NAME=pos_db
                            │
                            ├─► src/server/db/index.ts
                            │   • Detects: DB_MODE=local
                            │   • Creates: MySQL connection pool
                            │   • Uses: schema.ts (MySQL)
                            │   • Via: drizzle-orm/mysql2
                            │
                            ├─► src/server/trpc.ts
                            │   • Creates tRPC context
                            │   • Passes db instance
                            │
                            ├─► src/server/routers/*.ts
                            │   • products.ts
                            │   • orders.ts
                            │   • customers.ts
                            │   • [etc...]
                            │   • All queries use: ctx.db
                            │
                            └─► DATABASE (MySQL)
                                Location: localhost:3306
                                Database: pos_db
                                Tables: 36
                                Data: ✅ Your existing data
                                Status: ✅ READY
                                Connection: ✅ ACTIVE


┌─────────────────────────────────────────────────────────────┐
│                    npm run dev:cloud                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ├─► scripts/dev-cloud.js
                        │   • Copies .env.local.supabase → .env.local
                        │   • Backs up current .env.local
                        │   • Runs: npm run dev
                        │
                        └─► .env.local (ACTIVE)
                            DB_MODE=postgres
                            DATABASE_URL=postgresql://...
                            @db.qzgwbezcduuqsnkzkkko.supabase.co
                            │
                            ├─► src/server/db/index.ts
                            │   • Detects: DATABASE_URL (PostgreSQL)
                            │   • Creates: Supabase PostgreSQL client
                            │   • Uses: schema.postgres.ts
                            │   • Via: postgres-js
                            │
                            ├─► src/server/trpc.ts
                            │   • Creates tRPC context
                            │   • Passes db instance
                            │
                            ├─► src/server/routers/*.ts
                            │   • All routers use same ctx.db
                            │   • No code changes needed
                            │
                            └─► DATABASE (Supabase PostgreSQL)
                                Location: db.qzgwbezcduuqsnkzkkko.supabase.co
                                Database: postgres
                                Tables: ⏳ Awaiting migration
                                Data: ⏳ Awaiting import
                                Status: ⏳ READY (empty)
                                Connection: ⏳ Needs data import
```

---

## 🔄 Database Switching Flow

```
Current Mode: LOCAL MYSQL

npm run dev:local
    ↓
Backup .env.local → .env.local.backup
    ↓
Copy .env.local.mysql → .env.local
    ↓
Start Next.js
    ↓
DB detection: DB_MODE=local
    ↓
Use MySQL (localhost:3306)
    ↓
Connected ✅


To Switch to Cloud:
────────────────────

npm run dev:cloud
    ↓
Backup .env.local → .env.local.backup
    ↓
Copy .env.local.supabase → .env.local
    ↓
Start Next.js
    ↓
DB detection: DATABASE_URL (PostgreSQL)
    ↓
Use Supabase (db.qzgwbezcduuqsnkzkkko.supabase.co)
    ↓
Connected ✅


Back to Local:
──────────────

npm run dev:local
    ↓
Backup .env.local → .env.local.backup
    ↓
Restore .env.local.mysql → .env.local
    ↓
Start Next.js
    ↓
Connected ✅
```

---

## 📊 Data Flow Architecture

```
┌──────────────────────────────────────┐
│   Next.js Application               │
│   (src/app, src/components)         │
└──────────────┬───────────────────────┘
               │
               ├─► tRPC Client (@trpc/react-query)
               │   (src/lib/trpc.ts)
               │
               └─► HTTP Endpoints
                   /api/trpc/[trpc]
                   │
                   ├─► tRPC Server (@trpc/server)
                   │   (src/server/trpc.ts)
                   │
                   ├─► Context Creation
                   │   • Passes db instance
                   │   • Passes userId (auth)
                   │
                   ├─► tRPC Routers
                   │   ├─ products.ts ─┐
                   │   ├─ orders.ts    │
                   │   ├─ customers.ts │
                   │   ├─ suppliers.ts │
                   │   └─ [etc...]     │
                   │                    │
                   └────────────────────┼────► ctx.db (Database Instance)
                                        │
                   ┌────────────────────┴────────────────────┐
                   │                                         │
                   ▼                                         ▼
            MySQL (Local)                        PostgreSQL (Supabase)
            localhost:3306                       db.qzgwbezcduuqsnkzkkko
            pos_db                               postgres
            ✅ Active                            ⏳ Awaiting data
```

---

## 🗄️ Schema Compatibility

```
MySQL Schema (Local)
├─ InnoDB Tables
├─ varchar, int, decimal, timestamp
├─ AUTO_INCREMENT
├─ Foreign Keys (InnoDB)
└─ ENUM types (stored as int in MySQL)

        │ npm run migrate:supabase
        │ ↓
        ├─ SQL Export
        ├─ MySQL Dump
        └─ SQL Conversion

PostgreSQL Schema (Supabase)
├─ PostgreSQL Tables
├─ varchar, int, numeric, timestamp
├─ SEQUENCE (auto-increment)
├─ Foreign Keys (PostgreSQL)
└─ ENUM types (PostgreSQL enum)

Same Logical Structure ✅
Same Column Names ✅
Same Data Types (compatible) ✅
Same Relationships ✅
```

---

## 📈 ORM Architecture

```
Application Code (tRPC Routers)
    │
    ├─────────────────────────────────────┐
    │                                     │
    ▼                                     ▼
 Drizzle ORM                         Prisma ORM
 (Currently Active)                  (Alternative)
    │                                     │
    ├─► drizzle-orm/mysql2           ├─► @prisma/client
    ├─► drizzle-orm/postgres-js      │   (Generated in src/generated/prisma)
    │                                     │
    ├─ schema.ts (MySQL)             ├─ prisma/schema.prisma
    └─ schema.postgres.ts            └─ prisma/migrations/
                                         
Database Connections
    │
    ├─────────────────────────────────────┐
    │                                     │
    ▼                                     ▼
MySQL (Drizzle)                  PostgreSQL (Drizzle or Prisma)
localhost:3306                   db.qzgwbezcduuqsnkzkkko

Your existing APIs continue to work with BOTH database engines
```

---

## 🚀 Deployment Scenarios

### Scenario 1: Local Development Only
```
Developer Machine
    ├─ npm run dev:local
    ├─ Uses MySQL (localhost:3306)
    ├─ .env.local points to: DB_MODE=local
    └─ Data: Local machine
```

### Scenario 2: Hybrid (Local Dev + Cloud Production)
```
Developer Machine               Cloud Server (Production)
    │                                  │
    ├─ npm run dev:local              │
    │  Uses: MySQL localhost           │
    │  .env.local: DB_MODE=local      │
    │                                  │
    └─ npm run dev:cloud (test)       └─ npm start
       Uses: Supabase                   Uses: Supabase
       .env.local: DB_MODE=postgres    DATABASE_URL env var

Both use SAME database schema ✅
Code changes needed: ZERO ✅
```

### Scenario 3: Full Cloud
```
Cloud Deployment (Vercel/Railway)
    │
    ├─ DATABASE_URL env var → Supabase
    ├─ src/server/db/index.ts detects PostgreSQL
    ├─ Uses: schema.postgres.ts
    ├─ Connection: postgres-js
    └─ Data: Supabase PostgreSQL
```

---

## 🔐 Configuration Matrix

| Environment | DB_MODE | DATABASE_URL | DB_HOST | Result |
|-------------|---------|--------------|---------|--------|
| dev:local | local | (not set) | localhost | MySQL |
| dev:cloud | postgres | postgresql://... | supabase | PostgreSQL |
| production | postgres | postgresql://... | cloud | PostgreSQL |

Auto-detection logic in `src/server/db/index.ts`:
```
if (DB_MODE === "postgres") → Use PostgreSQL
else if (DB_MODE === "cloud") → Use MySQL with DATABASE_URL
else → Use MySQL with DB_HOST/DB_PORT/etc
```

---

## ✅ Migration Readiness

```
✅ READY TO USE:
├─ Local MySQL development
├─ Database auto-detection
├─ Dev scripts (switch instantly)
├─ Drizzle ORM integration
├─ Prisma ORM (alternative)
├─ Schema files (36 tables)
└─ Backup scripts

⏳ AWAITING ACTION:
├─ npm run migrate:supabase (create backups)
├─ Import SQL to Supabase Dashboard (manual)
├─ npm run dev:cloud (test after import)
└─ Deploy to production (when ready)

Schema is already compatible ✅
Data export script is ready ✅
Dev scripts are ready ✅
```

---

## 📞 Quick Command Reference

```bash
# Development
npm run dev:local              # Local MySQL
npm run dev:cloud              # Supabase PostgreSQL
npm run dev                    # Current config

# Database Operations
npm run db:push                # Apply Drizzle migrations
npm run prisma:generate        # Generate Prisma types
npm run backup                 # Backup to JSON

# Migration
npm run migrate:supabase       # Export MySQL → SQL for Supabase

# Diagnostics
node scripts/diagnostic.js     # Check configuration
```

---

This architecture allows you to:
✅ Develop locally (fast, no internet needed)
✅ Deploy to cloud (scalable, managed)
✅ Switch modes instantly (zero code changes)
✅ Migrate data safely (with backups)
✅ Use either ORM (Drizzle or Prisma)
