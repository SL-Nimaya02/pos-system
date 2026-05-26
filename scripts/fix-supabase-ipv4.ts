import { Pool } from 'pg';
import { config } from 'dotenv';
import * as dns from 'dns';

config({ path: '.env.local' });

async function testSupabaseConnection() {
  console.log('\n🔧 Supabase Connection Troubleshooting\n');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  console.log('📋 Current DATABASE_URL:');
  const urlObj = new URL(dbUrl);
  console.log(`   Host: ${urlObj.hostname}`);
  console.log(`   Port: ${urlObj.port}`);
  console.log(`   Database: ${urlObj.pathname}`);
  console.log(`   User: ${urlObj.username}`);
  console.log(`   Password: ${urlObj.password?.substring(0, 5)}...`);
  console.log(`   SSL: ${urlObj.searchParams.get('sslmode')}\n`);

  // Test 1: DNS resolution
  console.log('1️⃣  Testing DNS resolution...');
  try {
    const addresses = await dns.promises.resolve4(urlObj.hostname);
    console.log(`   ✓ IPv4 addresses found: ${addresses.join(', ')}\n`);
    
    // Try connecting to first IPv4
    console.log('2️⃣  Testing connection to IPv4 address...');
    const connectionString = dbUrl.replace(
      urlObj.hostname,
      addresses[0]
    );
    
    const pool = new Pool({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 10000,
    });

    const client = await pool.connect();
    const result = await client.query('SELECT NOW(), version()');
    console.log('   ✓ Connection successful!');
    console.log(`   Database time: ${result.rows[0].now}`);
    console.log(`   PostgreSQL version: ${result.rows[0].version?.substring(0, 50)}...\n`);
    
    // Test auth table access
    console.log('3️⃣  Testing table access...');
    try {
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        LIMIT 5
      `);
      console.log(`   ✓ Found ${tablesResult.rows.length} tables`);
      if (tablesResult.rows.length > 0) {
        console.log(`   Tables: ${tablesResult.rows.map(r => r.table_name).join(', ')}\n`);
      }
    } catch (err) {
      console.log(`   ⚠️  Could not list tables: ${(err as any).message}\n`);
    }

    client.release();
    pool.end();

    console.log('✅ Connection test passed! Using IPv4 address works.\n');
    console.log('📝 Recommended fix:');
    console.log(`   Update DATABASE_URL to use IPv4: ${connectionString.split('@')[1]?.split('?')[0] || 'N/A'}\n`);
    
    return true;
  } catch (error) {
    console.error(`   ❌ Connection failed: ${(error as any).message}\n`);
    
    console.log('💡 Possible solutions:');
    console.log('   1. Check Supabase project is active');
    console.log('   2. Verify database password is correct');
    console.log('   3. Check Supabase network settings allow your IP');
    console.log('   4. Try forcing IPv4 with NODE_OPTIONS environment variable\n');
    
    return false;
  }
}

testSupabaseConnection().catch(console.error);
