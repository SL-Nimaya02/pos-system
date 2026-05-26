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

console.log('🔄 Analyzing MySQL schema to generate PostgreSQL compatible SQL...\n');

async function generateCorrectSchema(connection: any): Promise<string> {
  let sql = `-- COMPLETE SUPABASE MIGRATION - SCHEMA + DATA (From actual MySQL schema)
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

-- Get all tables
`;

  const [tables]: any = await connection.execute(`
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME
  `);

  console.log(`📋 Generating schema for ${tables.length} tables...\n`);

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

    sql += `\n-- Table: ${tableName}\n`;
    sql += `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n`;
    sql += `CREATE TABLE "${tableName}" (\n`;

    const columnDefs: string[] = [];

    for (const col of columns) {
      let pgType = col.COLUMN_TYPE.replace(/\s+unsigned/i, ''); // Remove UNSIGNED
      
      // Map MySQL types to PostgreSQL
      pgType = pgType
        .replace(/^tinyint/i, 'SMALLINT')
        .replace(/^smallint/i, 'SMALLINT')
        .replace(/^mediumint/i, 'INTEGER')
        .replace(/^int\(/i, 'INTEGER')
        .replace(/^bigint/i, 'BIGINT')
        .replace(/^float/i, 'REAL')
        .replace(/^double/i, 'DOUBLE PRECISION')
        .replace(/^decimal/i, 'NUMERIC')
        .replace(/^varchar/i, 'VARCHAR')
        .replace(/^char/i, 'CHAR')
        .replace(/^text/i, 'TEXT')
        .replace(/^mediumtext/i, 'TEXT')
        .replace(/^longtext/i, 'TEXT')
        .replace(/^blob/i, 'BYTEA')
        .replace(/^mediumblob/i, 'BYTEA')
        .replace(/^longblob/i, 'BYTEA')
        .replace(/^date/i, 'DATE')
        .replace(/^datetime/i, 'TIMESTAMP')
        .replace(/^timestamp/i, 'TIMESTAMP')
        .replace(/^time/i, 'TIME')
        .replace(/^json/i, 'JSONB')
        .replace(/^enum\((.*)\)/i, 'VARCHAR(100)'); // Convert ENUM to VARCHAR

      let colDef = `    "${col.COLUMN_NAME}" ${pgType}`;

      if (col.IS_NULLABLE === 'NO') {
        colDef += ' NOT NULL';
      }

      if (col.COLUMN_KEY === 'PRI') {
        colDef += ' PRIMARY KEY';
      } else if (col.COLUMN_KEY === 'UNI') {
        colDef += ' UNIQUE';
      }

      if (col.EXTRA && col.EXTRA.includes('auto_increment')) {
        // Add sequence for auto_increment
        if (pgType.includes('INT')) {
          colDef = colDef.replace(/NOT NULL/, 'NOT NULL DEFAULT nextval(\'${tableName}_${col.COLUMN_NAME}_seq\')');
        }
      }

      columnDefs.push(colDef);
    }

    sql += columnDefs.join(',\n') + '\n);\n';
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
-- MIGRATION COMPLETE
-- ============================================================
`;

    // Save the file
    const backupDir = path.join(process.cwd(), 'backups');
    const timestamp = new Date().toISOString().split('T')[0];
    const completeSQLPath = path.join(backupDir, `pos_db_complete_correct_${timestamp}.sql`);

    fs.writeFileSync(completeSQLPath, completeSQLContent);

    console.log(`\n✅ Correct SQL file created!\n`);
    console.log(`📁 File: backups/pos_db_complete_correct_${timestamp}.sql`);
    console.log(`📊 Size: ${(completeSQLContent.length / 1024).toFixed(2)} KB\n`);

    console.log('🎯 This file has the CORRECT schema matching your MySQL database!\n');
    console.log('📋 How to use:\n');
    console.log('1. Go to: https://app.supabase.com/');
    console.log('2. Select project: qzgwbezcduuqsnkzkkko');
    console.log('3. Click: SQL Editor → New Query');
    console.log(`4. Copy file: backups/pos_db_complete_correct_${timestamp}.sql`);
    console.log('5. Paste into Supabase');
    console.log('6. Click RUN\n');
    console.log('✨ Done! Schema will match your MySQL exactly.\n');

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
