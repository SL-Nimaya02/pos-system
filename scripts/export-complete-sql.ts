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

console.log('🔄 Exporting MySQL data with proper PostgreSQL type conversion...\n');

function convertMySQLTypeToPostgres(mysqlType: string): string {
  const typeStr = mysqlType.toLowerCase().trim();

  if (typeStr.startsWith('enum')) return 'VARCHAR(255)';
  if (typeStr.startsWith('tinyint')) {
    return typeStr.includes('1') ? 'BOOLEAN' : 'SMALLINT';
  }
  if (typeStr.startsWith('smallint')) return 'SMALLINT';
  if (typeStr.startsWith('mediumint')) return 'INTEGER';
  if (typeStr.startsWith('int')) return 'INTEGER';
  if (typeStr.startsWith('bigint')) return 'BIGINT';
  if (typeStr.startsWith('float')) return 'REAL';
  if (typeStr.startsWith('double')) return 'DOUBLE PRECISION';
  if (typeStr.startsWith('decimal') || typeStr.startsWith('numeric')) {
    const match = typeStr.match(/decimal\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (match) return `NUMERIC(${match[1]},${match[2]})`;
    return 'NUMERIC(19,2)';
  }
  if (typeStr.startsWith('varchar')) {
    const match = typeStr.match(/varchar\s*\(\s*(\d+)\s*\)/i);
    if (match) return `VARCHAR(${match[1]})`;
    return 'VARCHAR(255)';
  }
  if (typeStr.startsWith('char')) {
    const match = typeStr.match(/char\s*\(\s*(\d+)\s*\)/i);
    if (match) return `CHAR(${match[1]})`;
    return 'CHAR(1)';
  }
  if (typeStr.startsWith('text') || typeStr.startsWith('mediumtext') || typeStr.startsWith('longtext')) {
    return 'TEXT';
  }
  if (typeStr.startsWith('blob') || typeStr.startsWith('mediumblob') || typeStr.startsWith('longblob')) {
    return 'BYTEA';
  }
  if (typeStr.startsWith('datetime') || typeStr.startsWith('timestamp')) {
    return 'TIMESTAMP';
  }
  if (typeStr.startsWith('date')) return 'DATE';
  if (typeStr.startsWith('time')) return 'TIME';
  if (typeStr.startsWith('json')) return 'JSONB';
  return 'VARCHAR(255)';
}

async function generateSchema(connection: any): Promise<string> {
  let sql = `-- COMPLETE SUPABASE MIGRATION - SCHEMA + DATA
-- Generated: ${new Date().toISOString()}
--
-- INSTRUCTIONS:
-- 1. Go to: https://app.supabase.com/
-- 2. Select project: qzgwbezcduuqsnkzkkko
-- 3. Click: SQL Editor → New Query
-- 4. Copy ALL content from this file
-- 5. Paste into Supabase SQL Editor
-- 6. Click RUN button
-- 7. Wait 3-5 minutes for completion
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

`;

  const [tables]: any = await connection.execute(`
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME
  `);

  console.log(`📋 Converting ${tables.length} tables to PostgreSQL...\n`);

  for (const tableRow of tables) {
    const tableName = tableRow.TABLE_NAME;

    if (tableName.includes('drizzle')) continue;

    const [columns]: any = await connection.execute(`
      SELECT 
        COLUMN_NAME,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_KEY,
        EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [tableName]);

    sql += `-- Table: ${tableName}\n`;
    sql += `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n`;
    sql += `CREATE TABLE "${tableName}" (\n`;

    const columnDefs: string[] = [];
    const primaryKeys: string[] = [];

    for (const col of columns) {
      const pgType = convertMySQLTypeToPostgres(col.COLUMN_TYPE);
      let colDef = `    "${col.COLUMN_NAME}" ${pgType}`;

      if (col.IS_NULLABLE === 'NO') {
        colDef += ' NOT NULL';
      }

      if (col.COLUMN_KEY === 'PRI') {
        primaryKeys.push(col.COLUMN_NAME);
      }

      if (col.EXTRA && col.EXTRA.includes('auto_increment')) {
        if (pgType.includes('INT') || pgType === 'BIGINT' || pgType === 'SMALLINT') {
          colDef += ` DEFAULT nextval('${tableName}_${col.COLUMN_NAME}_seq'::regclass)`;
        }
      }

      columnDefs.push(colDef);
    }

    if (primaryKeys.length > 0) {
      const pkDef = primaryKeys.length === 1
        ? `    PRIMARY KEY ("${primaryKeys[0]}")`
        : `    PRIMARY KEY (${primaryKeys.map(pk => `"${pk}"`).join(', ')})`;
      columnDefs.push(pkDef);
    }

    sql += columnDefs.join(',\n') + '\n);\n\n';
    console.log(`   ✓ ${tableName}`);
  }

  return sql;
}

async function exportData(connection: any): Promise<string> {
  let sql = `-- ============================================================
-- DATA IMPORT (All records from MySQL)
-- ============================================================

-- Disable triggers during import for performance
SET session_replication_role = replica;

`;

  const [tables]: any = await connection.execute(`
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME
  `);

  console.log(`📊 Exporting data from ${tables.length} tables...\n`);

  for (const tableRow of tables) {
    const tableName = tableRow.TABLE_NAME;

    if (tableName.includes('drizzle')) continue;

    try {
      // Get column info
      const [columns]: any = await connection.execute(`
        SELECT COLUMN_NAME, COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [tableName]);

      // Get data
      const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);

      if ((rows as any[]).length === 0) {
        console.log(`   ⊘ ${tableName}: No data`);
        continue;
      }

      const values = rows as any[];
      console.log(`   ✓ ${tableName}: ${values.length} records`);

      // Build INSERT statement
      const columnNames = columns.map((c: any) => `"${c.COLUMN_NAME}"`).join(', ');

      sql += `\n-- Insert data into ${tableName}\nINSERT INTO "${tableName}" (${columnNames}) VALUES\n`;

      const valueStrings = values.map((row: any) => {
        const rowValues = columns.map((col: any) => {
          const value = row[col.COLUMN_NAME];
          const colType = convertMySQLTypeToPostgres(col.COLUMN_TYPE);

          if (value === null || value === undefined) {
            return 'NULL';
          }

          // Convert 1/0 to true/false for BOOLEAN columns
          if (colType === 'BOOLEAN') {
            if (value === 1 || value === '1' || value === true) {
              return 'true';
            } else if (value === 0 || value === '0' || value === false) {
              return 'false';
            }
            return 'NULL';
          }

          if (typeof value === 'string') {
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
            const jsonStr = JSON.stringify(value).replace(/'/g, "''");
            return `'${jsonStr}'::jsonb`;
          }

          return String(value);
        }).join(', ');

        return `(${rowValues})`;
      });

      sql += valueStrings.join(',\n') + '\nON CONFLICT DO NOTHING;\n';
    } catch (error: any) {
      console.log(`   ⚠️ ${tableName}: ${error.message.substring(0, 60)}`);
    }
  }

  sql += `\n-- Re-enable triggers
SET session_replication_role = default;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
`;

  return sql;
}

async function main() {
  let connection: any;

  try {
    console.log(`📡 Connecting to MySQL...\n`);
    connection = await mysql.createConnection({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DB,
    });

    const schemaSQL = await generateSchema(connection);
    const dataSQL = await exportData(connection);

    const completeSQLContent = schemaSQL + '\n' + dataSQL;

    // Save the file
    const backupDir = path.join(process.cwd(), 'backups');
    const timestamp = new Date().toISOString().split('T')[0];
    const completeSQLPath = path.join(backupDir, `pos_db_complete_${timestamp}.sql`);

    fs.writeFileSync(completeSQLPath, completeSQLContent);

    console.log(`\n✅ Complete PostgreSQL-compatible SQL file created!\n`);
    console.log(`📁 File: backups/pos_db_complete_${timestamp}.sql`);
    console.log(`📊 Size: ${(completeSQLContent.length / 1024).toFixed(2)} KB\n`);

    console.log('🎯 Ready to import to Supabase!\n');
    console.log('📋 Steps:\n');
    console.log('1. Go to: https://app.supabase.com/');
    console.log('2. Select project: qzgwbezcduuqsnkzkkko');
    console.log('3. Click: SQL Editor → New Query');
    console.log(`4. Copy file: backups/pos_db_complete_${timestamp}.sql`);
    console.log('5. Paste into Supabase');
    console.log('6. Click RUN\n');
    console.log('✨ All schema + data will be imported automatically!\n');

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
