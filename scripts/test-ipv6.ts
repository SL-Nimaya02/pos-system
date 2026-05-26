import { Pool } from 'pg';
import { config } from 'dotenv';
import * as dns from 'dns';

config({ path: '.env.local' });

async function testSupabaseIPv6() {
  console.log('\n🔧 Testing IPv6 Connection to Supabase\n');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const urlObj = new URL(dbUrl);
  
  console.log('1️⃣  Resolving all addresses...');
  try {
    // Resolve all addresses (both IPv4 and IPv6)
    const addresses = await dns.promises.lookup(urlObj.hostname, { all: true });
    console.log(`   Found ${addresses.length} address(es):`);
    addresses.forEach((addr, i) => {
      console.log(`     ${i + 1}. ${addr.family === 4 ? 'IPv4' : 'IPv6'}: ${addr.address}`);
    });
    console.log();

    // Try connecting with hostname (let pg driver handle it)
    console.log('2️⃣  Testing connection with hostname...');
    const pool = new Pool({
      connectionString: dbUrl,
      max: 1,
      connectionTimeoutMillis: 15000,
      statement_timeout: 15000,
    });

    pool.on('error', (err) => {
      console.error('   ❌ Pool error:', err.message);
    });

    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as now');
      console.log('   ✅ Connection successful!');
      console.log(`   Server time: ${result.rows[0].now}\n`);
      client.release();
      pool.end();
      return true;
    } catch (connectErr) {
      console.error(`   ❌ Connection failed: ${(connectErr as any).message}\n`);
      pool.end();
      return false;
    }
  } catch (error) {
    console.error(`   ❌ DNS resolution failed: ${(error as any).message}\n`);
    return false;
  }
}

testSupabaseIPv6().then(success => {
  if (!success) {
    console.log('📝 Troubleshooting steps:');
    console.log('   1. Verify your network supports IPv6 connectivity');
    console.log('   2. Check firewall/VPN settings');
    console.log('   3. Try updating node-postgres (pg) package');
    console.log('   4. Update .env.local with NODE_OPTIONS\n');
  }
}).catch(console.error);
