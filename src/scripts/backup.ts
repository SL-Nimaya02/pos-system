/**
 * backup.ts — Full database backup to timestamped JSON + optional S3 upload
 *
 * Usage:
 *   npx tsx src/scripts/backup.ts
 *
 * Reads DB connection the same way as the main app (DB_MODE / DATABASE_URL /
 * DB_HOST etc. from .env.local or environment).
 *
 * Outputs:
 *   ./backups/backup-YYYY-MM-DDTHH-MM-SS.json
 *
 * If BACKUP_BUCKET is set alongside NEXT_PUBLIC_SUPABASE_URL +
 * SUPABASE_SERVICE_KEY, the file is also uploaded to that Supabase Storage
 * bucket using the S3-compatible API.
 */

import * as fs from "fs";
import * as path from "path";
import { config as loadEnv } from "dotenv";

// Load env before importing the db module
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

import { db } from "../server/db";
import * as schema from "../server/db/schema";

// ─── Table registry ───────────────────────────────────────────────────────────
// Add any new tables here so they are included in every backup.
const TABLES = {
  systemSettings:              schema.systemSettings,
  categories:                  schema.categories,
  cashRegisterSessions:        schema.cashRegisterSessions,
  cashMovements:               schema.cashMovements,
  products:                    schema.products,
  productVariants:             schema.productVariants,
  loyaltyAccounts:             schema.loyaltyAccounts,
  loyaltyTransactions:         schema.loyaltyTransactions,
  customerCreditTransactions:  schema.customerCreditTransactions,
  promotions:                  schema.promotions,
  orders:                      schema.orders,
  orderItems:                  schema.orderItems,
  suppliers:                   schema.suppliers,
  purchaseOrders:              schema.purchaseOrders,
  purchaseOrderItems:          schema.purchaseOrderItems,
  locations:                   schema.locations,
  posUsers:                    schema.posUsers,
  financialEntries:            schema.financialEntries,
  goodsReceipts:               schema.goodsReceipts,
  goodsReceiptItems:           schema.goodsReceiptItems,
  supplierTransactions:        schema.supplierTransactions,
  stockBatches:                schema.stockBatches,
  auditLogs:                   schema.auditLogs,
  balanceSheetAccounts:        schema.balanceSheetAccounts,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("[backup] Starting database backup…");

  const started = Date.now();
  const backup: Record<string, unknown[]> = {};

  // Export every registered table
  for (const [name, table] of Object.entries(TABLES)) {
    try {
      // Drizzle select() works identically for mysql2 and planetscale drivers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await (db as any).select().from(table);
      backup[name] = rows;
      console.log(`  [backup] ${name}: ${rows.length} rows`);
    } catch (err) {
      console.error(`  [backup] FAILED to export ${name}:`, err);
      // Continue with remaining tables — a partial backup is better than none
    }
  }

  // Write JSON file
  const outDir  = path.resolve(process.cwd(), "backups");
  const filename = `backup-${timestamp()}.json`;
  const filepath = path.join(outDir, filename);

  ensureDir(outDir);
  const json = JSON.stringify(
    { createdAt: new Date().toISOString(), tables: backup },
    null,
    2,
  );
  fs.writeFileSync(filepath, json, "utf-8");
  console.log(`[backup] Saved: ${filepath} (${(Buffer.byteLength(json) / 1024).toFixed(1)} KB)`);

  // ─── Optional: upload to Supabase Storage ───────────────────────────────────
  const bucket   = process.env.BACKUP_BUCKET;
  const supaUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey  = process.env.SUPABASE_SERVICE_KEY;

  if (bucket && supaUrl && supaKey) {
    console.log(`[backup] Uploading to Supabase Storage bucket "${bucket}"…`);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supaUrl, supaKey);

      const { error } = await supabase.storage
        .from(bucket)
        .upload(filename, Buffer.from(json), {
          contentType: "application/json",
          upsert: false,
        });

      if (error) {
        console.error("[backup] Upload failed:", error.message);
      } else {
        console.log(`[backup] Uploaded: ${bucket}/${filename}`);
      }
    } catch (err) {
      console.error("[backup] Upload error:", err);
    }
  } else if (bucket) {
    console.warn(
      "[backup] BACKUP_BUCKET is set but NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY are missing — skipping upload.",
    );
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`[backup] Done in ${elapsed}s`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[backup] Fatal error:", err);
  process.exit(1);
});
