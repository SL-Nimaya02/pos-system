import type { Config } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" }); // fallback

// When DATABASE_URL/MYSQL_URL is set, use it directly (PlanetScale, Railway, AWS RDS).
// Otherwise build credentials from individual vars (local MySQL).
const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
const useUrl = !!databaseUrl;

export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: useUrl
    ? { url: databaseUrl! }
    : {
        host:     process.env.DB_HOST     ?? process.env.MYSQLHOST     ?? "localhost",
        port:     Number(process.env.DB_PORT ?? process.env.MYSQLPORT ?? 3306),
        user:     process.env.DB_USER     ?? process.env.MYSQLUSER     ?? "root",
        password: process.env.DB_PASSWORD ?? process.env.MYSQLPASSWORD ?? "",
        database: process.env.DB_NAME     ?? process.env.MYSQLDATABASE ?? "pos_db",
      },
} satisfies Config;
