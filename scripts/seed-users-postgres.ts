import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schemaPostgres from "../src/server/db/schema.postgres";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables from .env.local
const envPath = resolve(process.cwd(), ".env.local");
try {
  readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  });
} catch (e) {
  console.log("⚠️  .env.local not found, using process.env");
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL not found in environment variables");
  console.error("Please set DATABASE_URL in .env.local or environment");
  process.exit(1);
}

console.log("🔌 Connecting to PostgreSQL database...");
const client = postgres(databaseUrl, {
  ssl: "require",
  max: 1,
});

const db = drizzle(client, { schema: schemaPostgres });

async function seedUsers() {
  try {
    console.log("👤 Seeding users to PostgreSQL...\n");

    const users = [
      { name: "Admin User", email: "admin@pos.lk", password: "admin123", role: "admin" as const },
      { name: "Sarah Cashier", email: "cashier@pos.lk", password: "cashier123", role: "cashier" as const },
      { name: "Manager Nimal", email: "nimal@pos.lk", password: "pass1234", role: "admin" as const },
      { name: "Cashier Priya", email: "priya@pos.lk", password: "pass1234", role: "cashier" as const },
    ];

    for (const u of users) {
      const id = crypto.randomUUID();
      const hash = await bcrypt.hash(u.password, 10);
      
      try {
        await (db as any).insert(schemaPostgres.posUsers).values({
          id,
          name: u.name,
          email: u.email,
          passwordHash: hash,
          role: u.role,
          isActive: true,
        }).onConflictDoNothing();
        console.log(`  ✓ ${u.name} <${u.email}> [${u.role}]`);
      } catch (error) {
        console.log(`  ⚠️  ${u.name} <${u.email}> might already exist`);
      }
    }

    console.log("\n✅ Users seeded successfully!");
    console.log("\n📋 Login credentials:");
    console.log("   Admin   → admin@pos.lk    / admin123");
    console.log("   Cashier → cashier@pos.lk  / cashier123");
  } catch (error) {
    console.error("❌ Failed to seed users:", error);
    throw error;
  } finally {
    await client.end();
    process.exit(0);
  }
}

seedUsers().catch((e) => {
  console.error("❌ Fatal error:", e);
  process.exit(1);
});
