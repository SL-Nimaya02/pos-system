import { config } from 'dotenv';

config({ path: '.env.local.supabase' });

const dbUrl = process.env.DATABASE_URL || '';
const urlObj = new URL(dbUrl);
const projectId = urlObj.hostname.match(/db\.(.*?)\.supabase\.co/)?.[1];

console.log('\n🔍 Supabase Connection Options\n');
console.log('📋 Current DATABASE_URL:');
console.log(`   ${dbUrl}\n`);

if (projectId) {
  console.log('🔗 Alternative connection endpoints:\n');
  
  console.log('1️⃣  Direct connection (current):');
  console.log(`   postgresql://postgres:PASSWORD@db.${projectId}.supabase.co:5432/postgres?sslmode=require\n`);
  
  console.log('2️⃣  Connection Pooler (recommended for cloud deployments):');
  console.log(`   postgresql://postgres:PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require\n`);
  
  console.log('3️⃣  IPv6 Direct (if IPv6 works):');
  console.log(`   postgresql://postgres:PASSWORD@db.${projectId}.supabase.co:5432/postgres?sslmode=require\n`);
  
  console.log('📝 Recommendations:\n');
  console.log('✓ Use the Connection Pooler endpoint for production/hosting');
  console.log('✓ Connection pooler has better IPv4 support');
  console.log('✓ Better for distributed/serverless deployments\n');
  
  console.log('🔑 Get your connection pooler credentials:');
  console.log('   1. Go to supabase.com console');
  console.log('   2. Select your project');
  console.log('   3. Go to Database → Connection strings');
  console.log('   4. Copy the "Connection string" (not "URI")\n');
} else {
  console.log('❌ Could not parse Supabase project ID\n');
}
