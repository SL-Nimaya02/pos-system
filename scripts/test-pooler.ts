import { Pool } from 'pg';
import * as tls from 'tls';

// Allow self-signed certificates globally
const originalReject = tls.checkServerIdentity;
(tls as any).checkServerIdentity = () => undefined;

// Note: Remove sslmode from URL to let ssl config handle it
const poolerUrl = 'postgresql://postgres.qzgwbezcduuqsnkzkkko:MOBPOSsystem123@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

console.log('\n🧪 Testing Supabase Connection Pooler\n');
console.log('📍 URL: aws-1-ap-south-1.pooler.supabase.com:5432\n');

async function testConnection() {
  try {
    const pool = new Pool({
      connectionString: poolerUrl,
      max: 1,
      connectionTimeoutMillis: 15000,
      statement_timeout: 15000,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    console.log('⏳ Connecting...');
    const client = await pool.connect();
    
    console.log('✅ Connected!\n');
    
    // Test query
    const result = await client.query('SELECT NOW() as now, version() as version');
    const row = result.rows[0];
    
    console.log('📊 Database Info:');
    console.log(`   Current time: ${row.now}`);
    console.log(`   PostgreSQL: ${row.version.split(',')[0]}\n`);
    
    // Check tables
    const tablesResult = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`✓ Database has ${tablesResult.rows[0].count} tables\n`);
    
    client.release();
    pool.end();
    
    console.log('🎉 Connection test PASSED!\n');
    console.log('✅ Ready to use for development\n');
    return true;
    
  } catch (error) {
    console.error('❌ Connection failed!\n');
    console.error('Error:', (error as any).message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Verify password is correct: MOBPOSsystem123');
    console.error('   2. Check network connectivity');
    console.error('   3. Verify port 5432 is not blocked\n');
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
