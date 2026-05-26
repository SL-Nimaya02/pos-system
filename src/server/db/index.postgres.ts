import { drizzle } from "drizzle-orm/postgres-js";
import { drizzle as drizzleMySQL } from "drizzle-orm/mysql2";
import postgres from "postgres";
import mysql from "mysql2/promise";
import * as schemaPostgres from "./schema.postgres";
import * as schemaMySQL from "./schema";

// ─── Mode detection ──────────────────────────────────────────────────────────
// DB_MODE: "local" | "cloud" | "planetscale"
//
// AUTO-DETECTION (preferred):
//  - If DATABASE_URL present → PostgreSQL (Supabase, Vercel Postgres, AWS RDS)
//  - If DATABASE_URL absent → MySQL local (docker-compose with individual vars)
//
// EXPLICIT DB_MODE (for advanced users):
//  - "local"       → MySQL with individual DB_* env vars (docker-compose)
//  - "cloud"       → MySQL with DATABASE_URL (Railway, AWS RDS, etc.)
//  - "planetscale" → MySQL HTTP client (Vercel serverless; uses @planetscale/database)
//  - "postgres"    → PostgreSQL with DATABASE_URL (Supabase, Vercel Postgres, etc.)
//
// If DB_MODE is unset, auto-detection runs:
//  - DATABASE_URL present → "postgres" (PostgreSQL)
//  - DATABASE_URL absent  → "local" (MySQL)

type DbMode = "local" | "cloud" | "planetscale" | "postgres";

const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

function resolveMode(): DbMode {
  const explicit = process.env.DB_MODE as DbMode | undefined;
  if (explicit) return explicit;
  
  // Auto-detect: if DATABASE_URL looks like PostgreSQL → "postgres", else "local"
  if (databaseUrl?.includes("postgresql://") || databaseUrl?.includes("postgres://")) {
    return "postgres";
  }
  return databaseUrl ? "cloud" : "local";
}

const DB_MODE = resolveMode();

// ─── Connection factory ───────────────────────────────────────────────────────
function createDatabase() {
  if (DB_MODE === "postgres") {
    // PostgreSQL via postgres-js (Supabase, Vercel Postgres, etc.)
    if (!databaseUrl) throw new Error("DB_MODE=postgres requires DATABASE_URL");
    
    // Create postgres client with connection pooling
    // Re-use pool across HMR reloads in development to avoid exhausting connections
    const globalForPg = global as typeof globalThis & { _pgClient?: postgres.Sql };
    const isProduction = process.env.NODE_ENV === 'production';
    
    const client = globalForPg._pgClient ?? postgres(databaseUrl, {
      max: isProduction ? 10 : 3, // Dev: 3, Prod: 10 (Supabase pooler limit is 15)
      idle_timeout: isProduction ? 30 : 10, // Close idle connections after X seconds
      connection_timeout: 10, // Connection timeout in seconds
      ssl: isProduction 
        ? 'require' 
        : { rejectUnauthorized: false }, // Allow self-signed certs for pooler in dev
    });
    
    if (!isProduction) globalForPg._pgClient = client;
    
    return drizzle(client, { schema: schemaPostgres });
  }

  if (DB_MODE === "planetscale") {
    // HTTP-based driver for Vercel serverless (no persistent TCP)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client } = require("@planetscale/database") as typeof import("@planetscale/database");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle: drizzlePS } = require("drizzle-orm/planetscale-serverless") as typeof import("drizzle-orm/planetscale-serverless");
    
    if (!databaseUrl) throw new Error("DB_MODE=planetscale requires DATABASE_URL or MYSQL_URL");
    
    const client = new Client({ url: databaseUrl });
    // Cast to MySQL type — query builder API is identical at runtime
    return drizzlePS(client, { schema: schemaMySQL }) as unknown as ReturnType<typeof drizzleMySQL<typeof schemaMySQL>>;
  }

  // ── MySQL via mysql2 pool (local dev and Railway/RDS) ──────────────────────
  // Re-use pool across HMR reloads in development to avoid exhausting connections
  const globalForDb = global as typeof globalThis & { _mysqlPool?: mysql.Pool };

  const poolConfig =
    DB_MODE === "cloud"
      ? (() => {
          if (!databaseUrl) throw new Error("DB_MODE=cloud requires DATABASE_URL or MYSQL_URL");
          return {
            uri: databaseUrl,
            waitForConnections: true,
            connectionLimit: 5,
            connectTimeout: 10000,
          };
        })()
      : {
          host:     process.env.DB_HOST     ?? process.env.MYSQLHOST     ?? "localhost",
          port:     Number(process.env.DB_PORT ?? process.env.MYSQLPORT ?? 3306),
          user:     process.env.DB_USER     ?? process.env.MYSQLUSER     ?? "root",
          password: process.env.DB_PASSWORD ?? process.env.MYSQLPASSWORD ?? "",
          database: process.env.DB_NAME     ?? process.env.MYSQLDATABASE ?? "pos_db",
          waitForConnections: true,
          connectionLimit: 10,
          connectTimeout: 10000,
        };

  const pool = globalForDb._mysqlPool ?? mysql.createPool(poolConfig);
  if (process.env.NODE_ENV !== "production") globalForDb._mysqlPool = pool;

  return drizzleMySQL(pool, { schema: schemaMySQL, mode: "default" });
}

export const db = createDatabase();

/** Current DB_MODE — useful for runtime diagnostics */
export { DB_MODE };
