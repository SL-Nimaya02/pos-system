import mysql from 'mysql2/promise';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const tables = [
  'system_settings',
  'categories',
  'cash_register_sessions',
  'cash_movements',
  'products',
  'product_variants',
  'loyalty_accounts',
  'customers',
  'loyalty_transactions',
  'customer_credit_transactions',
  'promotions',
  'orders',
  'order_items',
  'suppliers',
  'purchase_orders',
  'purchase_order_items',
  'locations',
  'pos_users',
  'financial_entries',
  'goods_receipts',
  'goods_receipt_items',
  'supplier_transactions',
  'stock_batches',
  'audit_logs',
  'balance_sheet_accounts',
  'raw_ingredients',
  'recipes',
  'recipe_ingredients',
  'ingredient_adjustments',
  'employees',
  'salary_structures',
  'attendance_records',
  'commission_rules',
  'salary_payments',
  'employee_supplier_links',
];

async function exportData() {
  let connection;
  try {
    console.log('🚀 Exporting MySQL Data for Supabase Import\n');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'pos_db',
    });

    mkdirSync('supabase-exports', { recursive: true });

    let totalSql = '';
    let totalRows = 0;

    console.log('📊 Exporting table data:\n');

    for (const table of tables) {
      try {
        const [rows] = await connection.query(`SELECT * FROM \`${table}\``);

        if (rows.length === 0) {
          console.log(`  ⏭️  ${table.padEnd(30)} (no data)`);
          continue;
        }

        // Build INSERT statement
        const columns = Object.keys(rows[0]);
        const columnList = columns.map((c) => `"${c}"`).join(', ');

        const values = rows.map((row) => {
          return `(${columns
            .map((col) => {
              const val = row[col];
              if (val === null) return 'NULL';
              if (typeof val === 'string') {
                // Escape single quotes
                const escaped = val.replace(/'/g, "''");
                return `'${escaped}'`;
              }
              if (typeof val === 'boolean') return val ? 'true' : 'false';
              if (Buffer.isBuffer(val)) {
                return `'\\x${val.toString('hex')}'`;
              }
              if (val instanceof Date) {
                return `'${val.toISOString()}'`;
              }
              if (typeof val === 'object') {
                const jsonStr = JSON.stringify(val).replace(/'/g, "''");
                return `'${jsonStr}'`;
              }
              return String(val);
            })
            .join(', ')})`;
        }).join(', ');

        const sql = `INSERT INTO "${table}" (${columnList}) VALUES ${values};\n`;
        totalSql += sql;
        totalRows += rows.length;

        console.log(`  ✅ ${table.padEnd(30)} ${rows.length} rows`);
      } catch (err) {
        if (err.message.includes('no such table') || err.message.includes("doesn't exist")) {
          console.log(`  ⏭️  ${table.padEnd(30)} (table not found)`);
        } else {
          console.error(`  ❌ ${table.padEnd(30)} Error: ${err.message}`);
        }
      }
    }

    // Write to file
    const filename = `supabase-exports/data-import.sql`;
    writeFileSync(filename, totalSql);

    console.log(`\n═══════════════════════════════════════════`);
    console.log(`✨ Export Complete!`);
    console.log(`═══════════════════════════════════════════`);
    console.log(`\n📋 Summary:`);
    console.log(`  • Tables: ${tables.length}`);
    console.log(`  • Total Rows: ${totalRows}`);
    console.log(`  • SQL File: ${filename}`);
    console.log(`  • File Size: ${(totalSql.length / 1024).toFixed(2)} KB\n`);

    console.log(`🚀 Next Steps:`);
    console.log(`  1. Go to Supabase Dashboard > SQL Editor`);
    console.log(`  2. Create a NEW query`);
    console.log(`  3. Copy contents of: ${filename}`);
    console.log(`  4. Paste into SQL Editor`);
    console.log(`  5. Click Run\n`);
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (e) {
        // ignore
      }
    }
  }
}

exportData();
