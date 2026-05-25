import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// ─── Mode detection ──────────────────────────────────────────────────────────
// DB_MODE: "local" | "cloud" | "planetscale"
//
//  local        — mysql2 pool using individual vars (DB_HOST / DB_PORT / …)
//                 default when DATABASE_URL is absent
//  cloud        — mysql2 pool using DATABASE_URL  (Railway, AWS RDS, Aurora)
//  planetscale  — @planetscale/database HTTP client using DATABASE_URL
//                 REQUIRED on Vercel (no persistent TCP connections allowed)
//
// Auto-detection: if DB_MODE is unset, DATABASE_URL present → "cloud", else → "local"

type DbMode = "local" | "cloud" | "planetscale";

const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

function resolveMode(): DbMode {
  const explicit = process.env.DB_MODE as DbMode | undefined;
  if (explicit === "local" || explicit === "cloud" || explicit === "planetscale") return explicit;
  return databaseUrl ? "cloud" : "local";
}

const DB_MODE = resolveMode();

// ─── Connection factory ───────────────────────────────────────────────────────
function createDatabase() {
  if (DB_MODE === "planetscale") {
    // HTTP-based driver — works in Vercel serverless (no persistent TCP).
    // Requires: npm install @planetscale/database
    // Also set schema to schema.planetscale.ts via DRIZZLE_SCHEMA env if
    // you need FK-free migrations; the runtime query API is identical.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client } = require("@planetscale/database") as typeof import("@planetscale/database");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle: drizzlePS } = require("drizzle-orm/planetscale-serverless") as typeof import("drizzle-orm/planetscale-serverless");
    if (!databaseUrl) throw new Error("DB_MODE=planetscale requires DATABASE_URL or MYSQL_URL");
    const client = new Client({ url: databaseUrl });
    // Cast to mysql2 type — query builder API is identical at runtime
    return drizzlePS(client, { schema }) as unknown as ReturnType<typeof drizzle<typeof schema>>;
  }

  // ── mysql2 pool (local dev and Railway/RDS) ──────────────────────────────
  // Re-use pool across HMR reloads in development to avoid exhausting connections
  const globalForDb = global as typeof globalThis & { _mysqlPool?: mysql.Pool };

  const poolConfig =
    DB_MODE === "cloud"
      ? (() => {
          if (!databaseUrl) throw new Error("DB_MODE=cloud requires DATABASE_URL or MYSQL_URL");
          return { uri: databaseUrl, waitForConnections: true, connectionLimit: 5 };
        })()
      : {
          host:     process.env.DB_HOST     ?? process.env.MYSQLHOST     ?? "localhost",
          port:     Number(process.env.DB_PORT ?? process.env.MYSQLPORT ?? 3306),
          user:     process.env.DB_USER     ?? process.env.MYSQLUSER     ?? "root",
          password: process.env.DB_PASSWORD ?? process.env.MYSQLPASSWORD ?? "",
          database: process.env.DB_NAME     ?? process.env.MYSQLDATABASE ?? "pos_db",
          waitForConnections: true,
          connectionLimit: 10,
        };

  const pool = globalForDb._mysqlPool ?? mysql.createPool(poolConfig);
  if (process.env.NODE_ENV !== "production") globalForDb._mysqlPool = pool;

  return drizzle(pool, { schema, mode: "default" });
}

export const db = createDatabase();

/** Current DB_MODE — useful for runtime diagnostics */
export { DB_MODE };
