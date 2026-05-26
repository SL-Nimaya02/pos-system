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

console.log('🔄 Converting MySQL schema to PostgreSQL compatible SQL...\n');

function convertMySQLTypeToPostgres(mysqlType: string): string {
  // Remove spaces and convert to lowercase for comparison
  const typeStr = mysqlType.toLowerCase().trim();

  // Handle ENUM types
  if (typeStr.startsWith('enum')) {
    return 'VARCHAR(255)';
  }

  // Handle types with sizes - extract just the base type
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
    // Extract precision and scale if present
    const match = typeStr.match(/decimal\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (match) {
      return `NUMERIC(${match[1]},${match[2]})`;
    }
    return 'NUMERIC(19,2)';
  }

  // Text types
  if (typeStr.startsWith('varchar')) {
    const match = typeStr.match(/varchar\s*\(\s*(\d+)\s*\)/i);
    if (match) {
      return `VARCHAR(${match[1]})`;
    }
    return 'VARCHAR(255)';
  }
  if (typeStr.startsWith('char')) {
    const match = typeStr.match(/char\s*\(\s*(\d+)\s*\)/i);
    if (match) {
      return `CHAR(${match[1]})`;
    }
    return 'CHAR(1)';
  }
  if (typeStr.startsWith('text') || typeStr.startsWith('mediumtext') || typeStr.startsWith('longtext')) {
    return 'TEXT';
  }

  // Binary types
  if (typeStr.startsWith('blob') || typeStr.startsWith('mediumblob') || typeStr.startsWith('longblob')) {
    return 'BYTEA';
  }

  // Date/Time types
  if (typeStr.startsWith('datetime') || typeStr.startsWith('timestamp')) {
    return 'TIMESTAMP';
  }
  if (typeStr.startsWith('date')) return 'DATE';
  if (typeStr.startsWith('time')) return 'TIME';

  // JSON type
  if (typeStr.startsWith('json')) {
    return 'JSONB';
  }

  // Default fallback
  return 'VARCHAR(255)';
}

async function generateCorrectSchema(connection: any): Promise<string> {
  let sql = `-- COMPLETE SUPABASE MIGRATION - SCHEMA + DATA
-- Generated: ${new Date().toISOString()}
-- Schema extracted from actual MySQL database and converted to PostgreSQL
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

  // Create each table
  for (const tableRow of tables) {
    const tableName = tableRow.TABLE_NAME;

    if (tableName.includes('drizzle')) {
      continue; // Skip internal tables
    }

    const [columns]: any = await connection.execute(`
      SELECT 
        COLUMN_NAME,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_KEY,
        EXTRA,
        COLUMN_DEFAULT
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
      // Convert MySQL type to PostgreSQL
      const pgType = convertMySQLTypeToPostgres(col.COLUMN_TYPE);

      let colDef = `    "${col.COLUMN_NAME}" ${pgType}`;

      if (col.IS_NULLABLE === 'NO') {
        colDef += ' NOT NULL';
      }

      if (col.COLUMN_KEY === 'PRI') {
        primaryKeys.push(col.COLUMN_NAME);
      }

      // Handle AUTO_INCREMENT
      if (col.EXTRA && col.EXTRA.includes('auto_increment')) {
        if (pgType.includes('INT') || pgType === 'BIGINT' || pgType === 'SMALLINT') {
          // For integer types, use DEFAULT with sequence
          colDef += ` DEFAULT nextval('${tableName}_${col.COLUMN_NAME}_seq'::regclass)`;
        }
      }

      columnDefs.push(colDef);
    }

    // Add primary key constraint
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

    // Generate schema from actual MySQL
    const schemaSQL = await generateCorrectSchema(connection);

    // Read the data file
    const dataPath = path.join(process.cwd(), 'backups/pos_db_data_only_2026-05-26.sql');
    if (!fs.existsSync(dataPath)) {
      console.error('❌ Data file not found. Run: npm run export:data-only first');
      process.exit(1);
    }

    const dataSQL = fs.readFileSync(dataPath, 'utf-8');

    // Combine schema + data
    const completeSQLContent = `${schemaSQL}
-- ============================================================
-- DATA IMPORT (All records from MySQL)
-- ============================================================

-- Disable triggers during import for performance
SET session_replication_role = replica;

${dataSQL}

-- Re-enable triggers
SET session_replication_role = default;

-- ============================================================
-- MIGRATION COMPLETE - Verify:
-- ============================================================
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- ORDER BY table_name;
-- ============================================================
`;

    // Save the file
    const backupDir = path.join(process.cwd(), 'backups');
    const timestamp = new Date().toISOString().split('T')[0];
    const completeSQLPath = path.join(backupDir, `pos_db_complete_${timestamp}.sql`);

    fs.writeFileSync(completeSQLPath, completeSQLContent);

    console.log(`\n✅ PostgreSQL-compatible SQL file created!\n`);
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
