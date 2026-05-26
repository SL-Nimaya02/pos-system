import mysql from 'mysql2/promise';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load env vars
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

async function migrateData() {
  let mysqlConnection;
  let pgConnection;

  try {
    console.log('🚀 Starting data migration from MySQL to Supabase PostgreSQL...\n');

    // Connect to MySQL
    console.log('📦 Connecting to MySQL...');
    mysqlConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'pos_db',
    });
    console.log('✅ MySQL connected\n');

    // Connect to PostgreSQL (Supabase)
    console.log('🌐 Connecting to Supabase PostgreSQL...');
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not set in .env.local');
    }
    pgConnection = postgres(process.env.DATABASE_URL, {
      ssl: 'require',
      max: 10,
    });
    console.log('✅ Supabase connected\n');

    // Disable foreign key checks temporarily
    console.log('🔧 Disabling foreign key constraints...');
    await pgConnection`SET session_replication_role = replica`;
    console.log('✅ Constraints disabled\n');

    // Migrate data for each table
    console.log('📋 Migrating table data:\n');
    for (const table of tables) {
      try {
        // Select all data from MySQL table
        const [rows] = await mysqlConnection.query(`SELECT * FROM \`${table}\``);

        if (rows.length === 0) {
          console.log(`  ⏭️  ${table}: No data to migrate`);
          continue;
        }

        // Batch insert into PostgreSQL
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100);
          const columns = Object.keys(batch[0]);
          const columnList = columns.map((c) => `"${c}"`).join(', ');

          const values = batch.map((row) => {
            return `(${columns.map((col) => {
              const val = row[col];
              if (val === null) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
              if (typeof val === 'boolean') return val ? 'true' : 'false';
              if (Buffer.isBuffer(val)) return `'\\x${val.toString('hex')}'`;
              if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              return String(val);
            }).join(', ')})`;
          }).join(', ');

          const sql = `INSERT INTO "${table}" (${columnList}) VALUES ${values} ON CONFLICT DO NOTHING`;
          await pgConnection.unsafe(sql);
        }

        console.log(`  ✅ ${table}: ${rows.length} rows migrated`);
      } catch (err) {
        console.error(`  ❌ ${table}: Error - ${err.message}`);
      }
    }

    // Re-enable foreign key checks
    console.log('\n🔧 Re-enabling foreign key constraints...');
    await pgConnection`SET session_replication_role = default`;
    console.log('✅ Constraints re-enabled\n');

    console.log('✨ Data migration completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (mysqlConnection) await mysqlConnection.end();
    if (pgConnection) await pgConnection.end();
  }
}

migrateData();
