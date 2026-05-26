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

console.log('📊 Generating DATA-ONLY SQL export (no DELETE statements)...\n');

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

async function generateDataOnlySQL(mysqlConnection: any, tables: string[]): Promise<string> {
  let sql = `-- PostgreSQL Data Import (schema must be created first with Drizzle)
-- Generated: ${new Date().toISOString()}
-- This file contains only INSERT statements for data migration

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

      // Insert data ONLY (no DELETE)
      sql += `\n-- Insert data into ${table}\nINSERT INTO "${table}" (${columnNames}) VALUES\n`;

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

      sql += valueStrings.join(',\n') + '\nON CONFLICT DO NOTHING;\n';
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
    const sql = await generateDataOnlySQL(connection, tables);

    // Create backups directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Save SQL file
    const timestamp = new Date().toISOString().split('T')[0];
    const sqlFilePath = path.join(backupDir, `pos_db_data_only_${timestamp}.sql`);
    fs.writeFileSync(sqlFilePath, sql);

    console.log(`\n✅ Data-only SQL export created!\n`);
    console.log(`📁 File: ${sqlFilePath}`);
    console.log(`📊 Size: ${(sql.length / 1024).toFixed(2)} KB\n`);

    console.log('🎯 Next Steps:\n');
    console.log('1. Push schema to Supabase:');
    console.log('   npm run db:push\n');
    console.log('2. Then import data to Supabase Dashboard:');
    console.log('   • Open SQL Editor → New Query');
    console.log(`   • Copy content from: ${path.relative(process.cwd(), sqlFilePath)}`);
    console.log('   • Click Run\n');
    console.log('3. Test with cloud setup:');
    console.log('   npm run dev:cloud\n');

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
