import { randomBytes } from 'crypto';
import { config } from 'dotenv';

config({ path: '.env.local' });

console.log('\n🔍 POS System Auth Diagnostic\n');

// Check NEXTAUTH_SECRET
console.log('1️⃣  NEXTAUTH_SECRET Check:');
const secret = process.env.NEXTAUTH_SECRET;
if (secret) {
  console.log(`   ✓ Set: ${secret.substring(0, 20)}...`);
  console.log(`   Length: ${secret.length} characters`);
  if (secret.length < 32) {
    console.log('   ⚠️  WARNING: Secret is too short (< 32 chars). Generate a stronger one:');
    const newSecret = randomBytes(32).toString('hex');
    console.log(`   📝 Suggested: NEXTAUTH_SECRET=${newSecret}`);
  }
} else {
  console.log('   ❌ NOT SET!');
}

// Check Database URL
console.log('\n2️⃣  Database Connection Check:');
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  const isSupabase = dbUrl.includes('supabase.co');
  const isLocal = dbUrl.includes('localhost');
  console.log(`   ✓ DATABASE_URL is set`);
  console.log(`   Mode: ${isSupabase ? '☁️  SUPABASE' : isLocal ? '💾 LOCAL' : '❓ UNKNOWN'}`);
  if (isSupabase) {
    const hostMatch = dbUrl.match(/db\.(.*?)\.supabase\.co/);
    if (hostMatch) {
      console.log(`   Project ID: ${hostMatch[1]}`);
    }
  }
} else {
  console.log('   ❌ NOT SET!');
}

// Check NEXTAUTH_URL
console.log('\n3️⃣  NextAuth URL Check:');
const authUrl = process.env.NEXTAUTH_URL;
if (authUrl) {
  console.log(`   ✓ NEXTAUTH_URL: ${authUrl}`);
} else {
  console.log('   ❌ NOT SET (should be http://localhost:3000 for dev)');
}

// Check Supabase config
console.log('\n4️⃣  Supabase Config Check:');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (supabaseUrl && supabaseKey) {
  console.log(`   ✓ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`);
  console.log(`   ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey.substring(0, 20)}...`);
} else {
  console.log('   ⚠️  Supabase keys not fully configured');
}

console.log('\n📋 Recommendations:\n');
console.log('1. Test database connection:');
console.log('   npx tsx scripts/test-db-connection.ts\n');
console.log('2. Regenerate NEXTAUTH_SECRET with:');
console.log('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n');
console.log('3. If using Supabase, verify:');
console.log('   - Project ID is correct');
console.log('   - Database password is set correctly');
console.log('   - Network connectivity to Supabase\n');
console.log('4. Switch to local database:');
console.log('   npm run dev:local\n');
