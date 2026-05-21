import type { Config } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" }); // fallback

// When DATABASE_URL is set, use it directly (PlanetScale, Railway, AWS RDS).
// Otherwise build credentials from individual vars (local MySQL).
const useUrl = !!process.env.DATABASE_URL;

export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: useUrl
    ? { url: process.env.DATABASE_URL! }
    : {
        host:     process.env.DB_HOST     ?? "localhost",
        port:     Number(process.env.DB_PORT ?? 3306),
        user:     process.env.DB_USER     ?? "root",
        password: process.env.DB_PASSWORD ?? "",
        database: process.env.DB_NAME     ?? "pos_db",
      },
} satisfies Config;
