#!/usr/bin/env node
/**
 * Supabase & Database Connection Diagnostic
 * Tests all database and Supabase configurations
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║     SUPABASE & DATABASE CONNECTION DIAGNOSTIC REPORT     ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// ─── 1. Environment Variables Check ──────────────────────────────────────
console.log('📋 1. ENVIRONMENT VARIABLES CHECK\n');

const envVars = {
  'DB_MODE': process.env.DB_MODE,
  'DATABASE_URL (masked)': process.env.DATABASE_URL ? '✓ Set' : '✗ Not set',
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY (masked)': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Not set',
  'SUPABASE_SERVICE_KEY': process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Not set',
  'SUPABASE_BUCKET': process.env.SUPABASE_BUCKET,
  'NEXTAUTH_SECRET (masked)': process.env.NEXTAUTH_SECRET ? '✓ Set' : '✗ Not set',
  'NEXTAUTH_URL': process.env.NEXTAUTH_URL,
};

Object.entries(envVars).forEach(([key, value]) => {
  const status = value ? '✓' : '✗';
  console.log(`  ${status} ${key}: ${value || 'Not configured'}`);
});

// ─── 2. Supabase Configuration Check ─────────────────────────────────────
console.log('\n📊 2. SUPABASE CONFIGURATION CHECK\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseBucket = process.env.SUPABASE_BUCKET;

let supabaseConfigStatus = 'INCOMPLETE';
let issues = [];

if (!supabaseUrl) {
  issues.push('❌ NEXT_PUBLIC_SUPABASE_URL is not set');
} else if (!supabaseUrl.includes('supabase.co')) {
  issues.push('⚠️  NEXT_PUBLIC_SUPABASE_URL looks invalid (should contain "supabase.co")');
}

if (!supabaseAnonKey) {
  issues.push('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
} else if (supabaseAnonKey.length < 20) {
  issues.push('⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY seems too short');
}

if (!supabaseBucket) {
  issues.push('⚠️  SUPABASE_BUCKET not configured (image storage disabled)');
}

if (issues.length === 0) {
  supabaseConfigStatus = 'COMPLETE ✓';
  console.log('  ✓ Supabase credentials configured');
  console.log(`  ✓ URL: ${supabaseUrl}`);
  console.log(`  ✓ Bucket: ${supabaseBucket || '(Not set - local storage)'}`);
} else {
  supabaseConfigStatus = 'INCOMPLETE ✗';
  issues.forEach(issue => console.log(`  ${issue}`));
}

// ─── 3. Database Mode Detection ──────────────────────────────────────────
console.log('\n🗄️  3. DATABASE MODE DETECTION\n');

const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
let dbMode = 'UNKNOWN';
let dbType = 'UNKNOWN';

if (databaseUrl?.includes('postgresql://') || databaseUrl?.includes('postgres://')) {
  dbMode = 'PostgreSQL (Supabase/Cloud)';
  dbType = 'PostgreSQL';
  console.log('  ✓ Database Mode: PostgreSQL');
  console.log('  ✓ Schema: src/server/db/schema.postgres.ts');
  console.log('  ✓ Config: drizzle.config.ts (postgres dialect)');
} else if (process.env.DB_MODE === 'local') {
  dbMode = 'MySQL (Local)';
  dbType = 'MySQL';
  console.log('  ✓ Database Mode: MySQL (Local)');
  console.log(`  ✓ Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`  ✓ Port: ${process.env.DB_PORT || 3306}`);
  console.log(`  ✓ Database: ${process.env.DB_NAME || 'pos_db'}`);
  console.log('  ✓ Schema: src/server/db/schema.ts');
} else if (databaseUrl && process.env.DB_MODE === 'cloud') {
  dbMode = 'MySQL (Cloud - via DATABASE_URL)';
  dbType = 'MySQL';
  console.log('  ✓ Database Mode: MySQL (Cloud)');
  console.log('  ✓ Using DATABASE_URL');
  console.log('  ✓ Schema: src/server/db/schema.ts');
} else {
  console.log('  ⚠️  Database mode unclear - checking defaults...');
  if (databaseUrl) {
    dbMode = 'MySQL (Cloud - auto-detected)';
    dbType = 'MySQL';
    console.log('  ✓ Database Mode: MySQL (auto-detected from DATABASE_URL)');
  } else {
    dbMode = 'MySQL (Local - auto-detected)';
    dbType = 'MySQL';
    console.log('  ✓ Database Mode: MySQL (Local - auto-detected)');
  }
}

// ─── 4. File Structure Check ────────────────────────────────────────────
console.log('\n📁 4. REQUIRED FILES CHECK\n');

const requiredFiles = [
  'src/server/db/index.ts',
  'src/server/db/schema.ts',
  'src/server/db/schema.postgres.ts',
  'src/lib/supabase-client.ts',
  'src/lib/supabase.ts',
  'drizzle.config.ts',
  'drizzle.config.postgres.ts',
  '.env.local.mysql',
  '.env.local.supabase',
  'scripts/dev-local.js',
  'scripts/dev-cloud.js',
];

const projectRoot = path.join(__dirname, '..');
requiredFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  const exists = fs.existsSync(fullPath);
  console.log(`  ${exists ? '✓' : '✗'} ${file}`);
});

// ─── 5. Migration Files Check ──────────────────────────────────────────
console.log('\n📜 5. MIGRATION FILES CHECK\n');

const migrationsPath = path.join(projectRoot, 'drizzle');
if (fs.existsSync(migrationsPath)) {
  const files = fs.readdirSync(migrationsPath);
  console.log(`  ✓ Drizzle migrations folder exists`);
  const sqlFiles = files.filter(f => f.endsWith('.sql'));
  console.log(`  ✓ SQL migration files found: ${sqlFiles.length}`);
  sqlFiles.forEach(file => {
    console.log(`    - ${file}`);
  });
} else {
  console.log('  ✗ Drizzle migrations folder not found');
}

// ─── 6. Authentication Check ────────────────────────────────────────────
console.log('\n🔐 6. AUTHENTICATION CHECK\n');

const authIssues = [];
if (!process.env.NEXTAUTH_SECRET) {
  authIssues.push('❌ NEXTAUTH_SECRET not set');
}
if (!process.env.NEXTAUTH_URL) {
  authIssues.push('❌ NEXTAUTH_URL not set');
}

if (authIssues.length === 0) {
  console.log('  ✓ NextAuth configured');
  console.log(`  ✓ Auth URL: ${process.env.NEXTAUTH_URL}`);
} else {
  authIssues.forEach(issue => console.log(`  ${issue}`));
}

// ─── 7. Summary Report ──────────────────────────────────────────────────
console.log('\n' + '═'.repeat(60));
console.log('                      SUMMARY REPORT\n');

console.log(`Database Type: ${dbType}`);
console.log(`Database Mode: ${dbMode}`);
console.log(`Supabase Setup: ${supabaseConfigStatus}`);
console.log(`Authentication: ${authIssues.length === 0 ? 'CONFIGURED ✓' : 'INCOMPLETE ✗'}`);

console.log('\n' + '═'.repeat(60) + '\n');

// ─── 8. Next Steps ──────────────────────────────────────────────────────
console.log('📝 NEXT STEPS:\n');

if (dbType === 'PostgreSQL') {
  console.log('  For Supabase (PostgreSQL):');
  console.log('    1. Run: npm run dev:cloud');
  console.log('    2. Run: npx drizzle-kit push (to apply migrations)');
  console.log('    3. Run: npx tsx scripts/seed.ts (to seed test data)');
  console.log('    4. Visit: http://localhost:3000/login');
} else {
  console.log('  For Local MySQL:');
  console.log('    1. Ensure MySQL is running (docker-compose up)');
  console.log('    2. Run: npm run dev:local');
  console.log('    3. Run: npx drizzle-kit push (to apply migrations)');
  console.log('    4. Run: npx tsx scripts/seed.ts (to seed test data)');
  console.log('    5. Visit: http://localhost:3000/login');
}

if (issues.length > 0) {
  console.log('\n  ⚠️  Issues found - review them above and fix before deploying');
}

console.log('\n');
