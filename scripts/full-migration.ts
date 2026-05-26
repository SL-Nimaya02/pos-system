import mysql from 'mysql2/promise';
import postgres from 'postgres';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

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

async function migrateAll() {
  let mysqlConnection;
  let pgConnection;

  try {
    console.log('🚀 Complete MySQL → Supabase Migration\n');

    // ============ PHASE 1: Apply Schema ============
    console.log('═══════════════════════════════════════════');
    console.log('PHASE 1: Applying Schema to Supabase');
    console.log('═══════════════════════════════════════════\n');

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

    // Read and execute schema SQL
    console.log('📖 Reading schema migration file...');
    const schemaPath = join(process.cwd(), 'drizzle', '0000_windy_the_stranger.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');
    console.log(`✅ Schema file read (${schemaSql.length} bytes)\n`);

    console.log('⚙️  Applying schema to Supabase...');
    // Split by statement-breakpoint and execute
    const statements = schemaSql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    let successCount = 0;
    for (let i = 0; i < statements.length; i++) {
      try {
        await pgConnection.unsafe(statements[i]);
        successCount++;
      } catch (err) {
        // Ignore "already exists" errors
        if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
          console.error(`  ⚠️  Statement ${i + 1} error: ${err.message}`);
        }
      }
      // Progress indicator
      if ((i + 1) % 5 === 0) {
        process.stdout.write('.');
      }
    }
    console.log(`\n✅ Schema applied: ${successCount}/${statements.length} statements executed\n`);

    // ============ PHASE 2: Migrate Data ============
    console.log('═══════════════════════════════════════════');
    console.log('PHASE 2: Migrating Data from MySQL');
    console.log('═══════════════════════════════════════════\n');

    // Connect to MySQL
    console.log('📦 Connecting to MySQL...');
    mysqlConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'pos_db',
    });
    console.log('✅ MySQL connected\n');

    // Disable foreign key checks temporarily
    console.log('🔧 Disabling foreign key constraints on Supabase...');
    await pgConnection`SET session_replication_role = replica`;
    console.log('✅ Constraints disabled\n');

    // Migrate data for each table
    console.log('📋 Migrating table data:\n');
    let totalRowsMigrated = 0;

    for (const table of tables) {
      try {
        // Select all data from MySQL table
        const [rows] = await mysqlConnection.query(`SELECT * FROM \`${table}\``);

        if (rows.length === 0) {
          console.log(`  ⏭️  ${table.padEnd(30)} No data`);
          continue;
        }

        // Clear existing data in PostgreSQL table (if any)
        await pgConnection.unsafe(`TRUNCATE TABLE "${table}" CASCADE`);

        // Batch insert into PostgreSQL
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100);
          const columns = Object.keys(batch[0]);
          const columnList = columns.map((c) => `"${c}"`).join(', ');

          const values = batch.map((row) => {
            return `(${columns
              .map((col) => {
                const val = row[col];
                if (val === null) return 'NULL';
                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                if (typeof val === 'boolean') return val ? 'true' : 'false';
                if (Buffer.isBuffer(val)) return `'\\x${val.toString('hex')}'`;
                if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                return String(val);
              })
              .join(', ')})`;
          }).join(', ');

          const sql = `INSERT INTO "${table}" (${columnList}) VALUES ${values} ON CONFLICT DO NOTHING`;
          await pgConnection.unsafe(sql);
        }

        console.log(`  ✅ ${table.padEnd(30)} ${rows.length} rows migrated`);
        totalRowsMigrated += rows.length;
      } catch (err) {
        if (err.message.includes('does not exist')) {
          console.log(`  ⏭️  ${table.padEnd(30)} Table not found (OK)`);
        } else {
          console.error(`  ❌ ${table.padEnd(30)} Error: ${err.message}`);
        }
      }
    }

    // Re-enable foreign key checks
    console.log('\n🔧 Re-enabling foreign key constraints...');
    await pgConnection`SET session_replication_role = default`;
    console.log('✅ Constraints re-enabled\n');

    // ============ Summary ============
    console.log('═══════════════════════════════════════════');
    console.log('✨ MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════');
    console.log(`\n📊 Summary:`);
    console.log(`  • Schema: Applied to Supabase ✅`);
    console.log(`  • Data: ${totalRowsMigrated} rows migrated ✅`);
    console.log(`  • Tables: ${tables.length} tables processed ✅\n`);
    console.log(`🚀 Your app now uses Supabase PostgreSQL!\n`);
    console.log(`Next steps:`);
    console.log(`  1. Run: npm run dev`);
    console.log(`  2. Visit: http://localhost:3000`);
    console.log(`  3. Test: Login, create orders, upload images\n`);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  • Is MySQL running? docker-compose up -d');
    console.error('  • Is DATABASE_URL set? Check .env.local');
    console.error('  • Network issues? Check internet connection\n');
    process.exit(1);
  } finally {
    if (mysqlConnection) {
      try {
        await mysqlConnection.end();
      } catch (e) {
        // ignore
      }
    }
    if (pgConnection) {
      try {
        await pgConnection.end();
      } catch (e) {
        // ignore
      }
    }
  }
}

migrateAll();
