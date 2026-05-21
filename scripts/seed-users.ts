import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../src/server/db/schema";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
});

const pool = mysql.createPool({
  host:     process.env.DB_HOST     ?? "localhost",
  port:     Number(process.env.DB_PORT ?? 3306),
  user:     process.env.DB_USER     ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME     ?? "pos_db",
});
const db = drizzle(pool, { schema, mode: "default" });

async function seedUsers() {
  console.log("👤 Seeding users...\n");

  const users = [
    { name: "Admin User",     email: "admin@pos.lk",   password: "admin123",   role: "admin"   as const },
    { name: "Sarah Cashier",  email: "cashier@pos.lk", password: "cashier123", role: "cashier" as const },
    { name: "Manager Nimal",  email: "nimal@pos.lk",   password: "pass1234",   role: "admin"   as const },
    { name: "Cashier Priya",  email: "priya@pos.lk",   password: "pass1234",   role: "cashier" as const },
  ];

  for (const u of users) {
    const id = crypto.randomUUID();
    const hash = await bcrypt.hash(u.password, 10);
    await db.insert(schema.posUsers).values({
      id,
      name:         u.name,
      email:        u.email,
      passwordHash: hash,
      role:         u.role,
    }).onDuplicateKeyUpdate({ set: { name: u.name } });
    console.log(`  ✓ ${u.name} <${u.email}> [${u.role}]`);
  }

  console.log("\n✅ Users seeded!");
  console.log("\n📋 Login credentials:");
  console.log("   Admin   → admin@pos.lk    / admin123");
  console.log("   Cashier → cashier@pos.lk  / cashier123");
  process.exit(0);
}

seedUsers().catch((e) => { console.error("❌ Failed:", e); process.exit(1); });
