import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local.mysql') });

const MYSQL_HOST = process.env.DB_HOST || 'localhost';
const MYSQL_PORT = parseInt(process.env.DB_PORT || '3306');
const MYSQL_USER = process.env.DB_USER || 'root';
const MYSQL_PASSWORD = process.env.DB_PASSWORD || 'root';
const MYSQL_DB = process.env.DB_NAME || 'pos_db';

async function main() {
  try {
    console.log('📊 Checking MySQL Database Structure...\n');
    
    const connection = await mysql.createConnection({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DB,
    });

    // Get all tables
    const [tables]: any = await connection.execute(`
      SELECT TABLE_NAME as name 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);

    console.log(`📋 Total Tables: ${tables.length}\n`);
    console.log('Tables with Record Count:\n');

    let totalRecords = 0;
    const tableData: any[] = [];

    for (const table of tables) {
      const [count]: any = await connection.execute(`SELECT COUNT(*) as cnt FROM \`${table.name}\``);
      const recordCount = count[0].cnt;
      totalRecords += recordCount;
      
      const status = recordCount > 0 ? '✓' : '○';
      console.log(`${status} ${table.name.padEnd(30)} : ${recordCount.toString().padStart(6)} records`);
      
      tableData.push({
        name: table.name,
        records: recordCount,
      });
    }

    console.log(`\n📊 Total Records Across All Tables: ${totalRecords}\n`);

    // Get database size
    const [sizeResult]: any = await connection.execute(`
      SELECT 
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);

    console.log(`💾 Database Size: ${sizeResult[0].size_mb} MB\n`);

    // Show table structure for first few tables
    console.log('📐 Sample Table Structures:\n');
    
    for (let i = 0; i < Math.min(3, tables.length); i++) {
      const table = tables[i];
      const [columns]: any = await connection.execute(`
        SELECT COLUMN_NAME as name, COLUMN_TYPE as type, IS_NULLABLE as nullable
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      `, [table.name]);

      console.log(`📑 ${table.name}:`);
      columns.forEach((col: any) => {
        console.log(`   • ${col.name.padEnd(25)} : ${col.type.padEnd(20)} ${col.nullable === 'NO' ? '[NOT NULL]' : ''}`);
      });
      console.log('');
    }

    console.log('✅ Database diagnostic complete!\n');
    console.log('🎯 Ready to migrate to Supabase using: npm run migrate:http\n');

    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
