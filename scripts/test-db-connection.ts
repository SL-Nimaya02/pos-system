import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

config({ path: '.env.local' });

async function main() {
  console.log('\n🧪 Testing Supabase Connection...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const dbUrl = process.env.DATABASE_URL;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase config in .env.local');
    process.exit(1);
  }

  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Using anon key: ${supabaseKey.substring(0, 20)}...\n`);

  // Test 1: Supabase client
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✓ Supabase client created\n');

    // Test 2: Try to fetch from auth users
    console.log('Testing data access...');
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('❌ Auth access failed:', error.message);
    } else {
      console.log('✓ Auth access successful');
    }
  } catch (error) {
    console.error('❌ Error:', (error as any).message);
  }

  // Test 3: Direct PostgreSQL connection if DATABASE_URL is set
  if (dbUrl) {
    console.log('\n📡 Testing PostgreSQL connection...');
    try {
      const pool = new Pool({ connectionString: dbUrl });
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      console.log('✓ PostgreSQL connection successful');
      console.log('  Current time from DB:', result.rows[0].now);
      client.release();
      pool.end();
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', (error as any).message);
      console.error('   This is likely the cause of your 401 auth errors');
    }
  }

  console.log('\n✅ Diagnostic complete\n');
}

main().catch(console.error);
