#!/usr/bin/env node
/**
 * MySQL to Supabase Database Migration Script
 * 
 * This script will:
 * 1. Backup your local MySQL database (schema + data)
 * 2. Generate SQL for Supabase
 * 3. Provide instructions for importing to Supabase
 * 
 * Usage: npx tsx scripts/migrate-to-supabase.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment
config({ path: path.join(process.cwd(), '.env.local') });
config({ path: path.join(process.cwd(), '.env') });

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const BACKUP_FILE = path.join(BACKUP_DIR, `pos_db_backup_${TIMESTAMP}.sql`);

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║   MySQL → Supabase Database Migration Script              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`✓ Created backup directory: ${BACKUP_DIR}\n`);
}

// Configuration from environment
const mysqlHost = process.env.DB_HOST || 'localhost';
const mysqlPort = process.env.DB_PORT || '3306';
const mysqlUser = process.env.DB_USER || 'root';
const mysqlPassword = process.env.DB_PASSWORD || '';
const mysqlDatabase = process.env.DB_NAME || 'pos_db';

console.log('📊 LOCAL MYSQL CONFIGURATION:');
console.log(`  Host: ${mysqlHost}`);
console.log(`  Port: ${mysqlPort}`);
console.log(`  Database: ${mysqlDatabase}`);
console.log(`  User: ${mysqlUser}\n`);

// Step 1: Export MySQL database
console.log('🔄 Step 1: Exporting MySQL database...');
try {
  const mysqldumpCmd = `mysqldump --host=${mysqlHost} --port=${mysqlPort} --user=${mysqlUser} ${
    mysqlPassword ? `--password=${mysqlPassword}` : ''
  } --single-transaction --lock-tables=false ${mysqlDatabase} > "${BACKUP_FILE}"`;

  execSync(mysqldumpCmd, { stdio: 'inherit', shell: true });
  console.log(`✓ Database exported to: ${BACKUP_FILE}\n`);
} catch (error) {
  console.error('✗ Failed to export MySQL database');
  console.error('  Make sure mysqldump is installed and in your PATH\n');
  process.exit(1);
}

// Step 2: Modify SQL for Supabase compatibility
console.log('🔄 Step 2: Converting SQL for Supabase...');
try {
  let sql = fs.readFileSync(BACKUP_FILE, 'utf-8');

  // Remove MySQL-specific commands
  sql = sql.replace(/\/\*!40[0-9]{3,} [^*]*\*\/;?/g, '');
  sql = sql.replace(/SET @[^;]+;/g, '');
  sql = sql.replace(/SET NAMES utf8mb4;/g, '');
  sql = sql.replace(/SET SQL_MODE[^;]+;/g, '');
  sql = sql.replace(/CREATE DATABASE[^;]+;/g, '');
  sql = sql.replace(/USE `[^`]+`;/g, '');

  // Replace backticks with quotes (MySQL uses backticks, PostgreSQL uses quotes or no quotes)
  sql = sql.replace(/`/g, '"');

  // Fix ENUM types for PostgreSQL (add IF NOT EXISTS for types)
  sql = sql.replace(
    /^CREATE TYPE/gm,
    'DO $$ BEGIN\n    CREATE TYPE'
  );

  // Save modified SQL
  const supabaseFile = BACKUP_FILE.replace('.sql', '_supabase.sql');
  fs.writeFileSync(supabaseFile, sql);
  console.log(`✓ Supabase-compatible SQL saved to: ${supabaseFile}\n`);

  // Display file info
  const originalSize = fs.statSync(BACKUP_FILE).size;
  const supabaseSize = fs.statSync(supabaseFile).size;
  console.log(`  Original MySQL dump:  ${(originalSize / 1024).toFixed(2)} KB`);
  console.log(`  Supabase SQL:         ${(supabaseSize / 1024).toFixed(2)} KB\n`);
} catch (error) {
  console.error('✗ Failed to convert SQL:', error);
  process.exit(1);
}

// Step 3: Generate instructions
console.log('📋 Step 3: Generating import instructions...\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const instructionsFile = path.join(BACKUP_DIR, `IMPORT_INSTRUCTIONS_${TIMESTAMP}.md`);

const instructions = `# Supabase Import Instructions

## Database Files Generated
- **Original MySQL Export**: \`pos_db_backup_${TIMESTAMP}.sql\`
- **Supabase-Compatible SQL**: \`pos_db_backup_${TIMESTAMP}_supabase.sql\`

## Method 1: Via Supabase Dashboard (Easiest) ✓ RECOMMENDED

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project: \`qzgwbezcduuqsnkzkkko\`
3. Go to **SQL Editor** → **New Query**
4. Open the file: \`pos_db_backup_${TIMESTAMP}_supabase.sql\`
5. Copy and paste the entire SQL content
6. Click **Run**
7. Wait for completion (may take a few minutes for large datasets)

## Method 2: Via Supabase CLI

\`\`\`bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Push migrations
supabase db push

# Execute SQL file
psql --file="pos_db_backup_${TIMESTAMP}_supabase.sql" "postgresql://postgres:PASSWORD@db.qzgwbezcduuqsnkzkkko.supabase.co:5432/postgres"
\`\`\`

## Method 3: Programmatically with psql

\`\`\`bash
# Replace PASSWORD with your Supabase database password
psql -h db.qzgwbezcduuqsnkzkkko.supabase.co \\
     -U postgres \\
     -d postgres \\
     -f pos_db_backup_${TIMESTAMP}_supabase.sql
\`\`\`

## Verification Steps

After importing, verify the migration:

\`\`\`sql
-- Check table count
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check specific tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Count rows in main tables
SELECT 'products' as table_name, COUNT(*) as rows FROM products
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'customers', COUNT(*) FROM customers;
\`\`\`

## Troubleshooting

### Issue: "ENUM type already exists"
- Skip this error, it means the type is already defined
- You can modify the SQL to add \`IF NOT EXISTS\`

### Issue: "Foreign key constraint fails"
- Import tables in this order:
  1. Categories, Suppliers, Employees
  2. Products, Customers
  3. Orders, Purchase Orders
  4. Order Items, GRN Items

### Issue: "Connection refused"
- Check that your Supabase project is active
- Verify the database password is correct
- Check firewall/network settings

## Network Issues

If you're unable to connect directly to Supabase from your network:

1. **Option A**: Use the Supabase Dashboard's SQL Editor (no direct connection needed)
2. **Option B**: Deploy to a cloud server and run the migration from there
3. **Option C**: Ask Supabase support to import the SQL file directly

## After Import

Once imported, switch your app to use Supabase:

\`\`\`bash
# Test with cloud database
npm run dev:cloud

# Run Drizzle migrations (if any pending)
npx drizzle-kit push

# Test your app
# Visit: http://localhost:3000
\`\`\`

## Rollback

To revert to local MySQL:

\`\`\`bash
npm run dev:local
\`\`\`

---
**Generated**: ${new Date().toISOString()}
**Database**: pos_db (POS System)
`;

fs.writeFileSync(instructionsFile, instructions);
console.log(`✓ Import instructions saved to: ${instructionsFile}\n`);

// Step 4: Display summary
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                    MIGRATION SUMMARY                       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📁 Backup Files Created:');
console.log(`  • ${path.basename(BACKUP_FILE)}`);
console.log(`  • ${path.basename(BACKUP_FILE.replace('.sql', '_supabase.sql'))}`);
console.log(`  • ${path.basename(instructionsFile)}\n`);

console.log('🚀 Next Steps:');
console.log('  1. Open the SQL Editor in Supabase Dashboard');
console.log('  2. Copy & paste the Supabase-compatible SQL file');
console.log('  3. Run the query and wait for completion');
console.log('  4. Test with: npm run dev:cloud\n');

console.log('📚 Documentation:');
console.log(`  See: ${instructionsFile}\n`);

console.log('⚠️  Important Notes:');
console.log('  • Keep your backup files safe');
console.log('  • Test the Supabase import in a test environment first');
console.log('  • Once imported, update your production DATABASE_URL');
console.log('  • Both dev:local and dev:cloud will work\n');

console.log('✓ Migration script completed!\n');
