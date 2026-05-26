import * as mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local.mysql') });

const MYSQL_HOST = process.env.DB_HOST || 'localhost';
const MYSQL_PORT = parseInt(process.env.DB_PORT || '3306');
const MYSQL_USER = process.env.DB_USER || 'root';
const MYSQL_PASSWORD = process.env.DB_PASSWORD || 'root';
const MYSQL_DB = process.env.DB_NAME || 'pos_db';

console.log('📊 Generating PostgreSQL-compatible SQL export...\n');

// Get actual tables from MySQL dynamically
async function getActualTables(mysqlConnection: any): Promise<string[]> {
  const [tables]: any = await mysqlConnection.execute(`
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME
  `);
  return tables.map((t: any) => t.TABLE_NAME).filter((t: string) => !t.includes('drizzle'));
}

async function generatePostgresSQL(mysqlConnection: any, tables: string[]): Promise<string> {
  let sql = `-- PostgreSQL Migration from MySQL POS Database
-- Generated: ${new Date().toISOString()}
-- This file contains data exports from all MySQL tables

-- Disable triggers during import for performance
SET session_replication_role = replica;

`;

  for (const table of tables) {
    try {
      const [rows] = await mysqlConnection.execute(`SELECT * FROM \`${table}\``);
      
      if ((rows as any[]).length === 0) {
        console.log(`   ⊘ ${table}: No data`);
        continue;
      }

      const values = rows as any[];
      console.log(`   ✓ ${table}: ${values.length} records`);

      // Get columns
      const [columns]: any = await mysqlConnection.execute(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      `, [table]);

      const columnNames = columns.map((c: any) => `"${c.COLUMN_NAME}"`).join(', ');

      // Delete existing records
      sql += `\n-- Truncate ${table}\nDELETE FROM "${table}";\n`;

      // Insert data
      sql += `-- Insert data into ${table}\nINSERT INTO "${table}" (${columnNames}) VALUES\n`;

      const valueStrings = values.map((row: any) => {
        const rowValues = columns.map((col: any) => {
          const value = row[col.COLUMN_NAME];
          
          if (value === null || value === undefined) {
            return 'NULL';
          }
          
          if (typeof value === 'string') {
            // Escape single quotes
            const escaped = value.replace(/'/g, "''");
            return `'${escaped}'`;
          }
          
          if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
          }
          
          if (value instanceof Date) {
            return `'${value.toISOString()}'`;
          }
          
          if (typeof value === 'object') {
            // JSON values
            const jsonStr = JSON.stringify(value).replace(/'/g, "''");
            return `'${jsonStr}'::jsonb`;
          }
          
          return String(value);
        }).join(', ');
        
        return `(${rowValues})`;
      });

      sql += valueStrings.join(',\n') + ';\n';
    } catch (error: any) {
      console.log(`   ⚠️ ${table}: ${error.message.substring(0, 60)}`);
    }
  }

  sql += `\n-- Re-enable triggers
SET session_replication_role = default;
`;

  return sql;
}

async function main() {
  let connection: any;

  try {
    console.log(`📡 Connecting to MySQL (${MYSQL_HOST}:${MYSQL_PORT})...`);
    connection = await mysql.createConnection({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DB,
    });
    console.log('✅ Connected\n');

    // Get tables
    const tables = await getActualTables(connection);
    console.log(`🔍 Found ${tables.length} tables\n`);
    console.log('📋 Extracting data:\n');

    // Generate SQL
    const sql = await generatePostgresSQL(connection, tables);

    // Create backups directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Save SQL file
    const timestamp = new Date().toISOString().split('T')[0];
    const sqlFilePath = path.join(backupDir, `pos_db_migration_${timestamp}.sql`);
    fs.writeFileSync(sqlFilePath, sql);

    console.log(`\n✅ SQL export created!\n`);
    console.log(`📁 File: ${sqlFilePath}`);
    console.log(`📊 Size: ${(sql.length / 1024).toFixed(2)} KB\n`);

    // Create import instructions
    const instructions = `# How to Import to Supabase

## Method 1: Supabase Dashboard (Easiest)

1. Open [Supabase Dashboard](https://app.supabase.com/)
2. Select your project: **qzgwbezcduuqsnkzkkko**
3. Go to **SQL Editor** → **New Query**
4. Copy entire content from: \`${path.relative(process.cwd(), sqlFilePath)}\`
5. Paste into the SQL editor
6. Click **Run** button
7. Wait for completion (2-5 minutes for 363 records)

## Method 2: Supabase CLI

\`\`\`bash
supabase start
supabase db pull
# Then paste the SQL into the editor
\`\`\`

## Method 3: psql Command (Advanced)

\`\`\`bash
psql postgresql://postgres:MOBPOSsystem123@db.qzgwbezcduuqsnkzkkko.supabase.co:5432/postgres -f ${path.relative(process.cwd(), sqlFilePath)}
\`\`\`

## After Import

1. Verify data in Supabase Dashboard
2. Run: \`npm run dev:cloud\`
3. Test your application
4. Check all features work correctly

## Troubleshooting

**If import fails:**
- Check network connectivity to Supabase
- Verify PostgreSQL credentials are correct
- Ensure tables exist in Supabase database
- Try importing smaller batches manually

**If data looks incorrect:**
- Check date/time formats in Supabase
- Verify ENUM types are correctly created
- Check JSON fields are properly formatted

---

Generated: ${new Date().toISOString()}
`;

    const instructionsPath = path.join(backupDir, `IMPORT_INSTRUCTIONS_${timestamp}.md`);
    fs.writeFileSync(instructionsPath, instructions);

    console.log(`📖 Instructions saved to: ${instructionsPath}\n`);

    console.log('🎯 Next Steps:');
    console.log(`\n1. Open the SQL file in: backups/pos_db_migration_${timestamp}.sql`);
    console.log('2. Copy the entire content');
    console.log('3. Go to Supabase Dashboard → SQL Editor → New Query');
    console.log('4. Paste and click Run');
    console.log('5. Once complete, run: npm run dev:cloud\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
