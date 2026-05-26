import type { Config } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" }); // fallback

/**
 * Drizzle Kit Configuration — supports MySQL and PostgreSQL
 * 
 * AUTO-DETECTION:
 * - If DATABASE_URL is present → PostgreSQL (Supabase, Vercel Postgres, etc.)
 * - If DATABASE_URL is absent → MySQL (local or cloud via individual credentials)
 * 
 * SUPABASE / VERCEL POSTGRES:
 *   Set DATABASE_URL to your Supabase PostgreSQL URI:
 *   postgresql://user:password@host.supabase.co:5432/postgres?sslmode=require
 * 
 * MYSQL (LOCAL or CLOUD):
 *   Leave DATABASE_URL unset and use DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 */

const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
const isPostgres = !!databaseUrl; // If DATABASE_URL is set, assume PostgreSQL

export default {
  schema: isPostgres 
    ? "./src/server/db/schema.postgres.ts"
    : "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: isPostgres ? "postgresql" : "mysql",
  dbCredentials: isPostgres
    ? { url: databaseUrl! }
    : {
        host:     process.env.DB_HOST     ?? process.env.MYSQLHOST     ?? "localhost",
        port:     Number(process.env.DB_PORT ?? process.env.MYSQLPORT ?? 3306),
        user:     process.env.DB_USER     ?? process.env.MYSQLUSER     ?? "root",
        password: process.env.DB_PASSWORD ?? process.env.MYSQLPASSWORD ?? "",
        database: process.env.DB_NAME     ?? process.env.MYSQLDATABASE ?? "pos_db",
      },
} satisfies Config;
