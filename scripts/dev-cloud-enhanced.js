#!/usr/bin/env node
/**
 * Enhanced dev-cloud with DNS and connection debugging
 */
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

const envFile = path.join(__dirname, '..', '.env.local.supabase');
const envLocalFile = path.join(__dirname, '..', '.env.local');

// Backup and load Supabase env
if (fs.existsSync(envLocalFile)) {
  fs.copyFileSync(envLocalFile, envLocalFile + '.backup');
  console.log(`📦 Backed up current .env.local`);
}

fs.copyFileSync(envFile, envLocalFile);
console.log(`☁️  Loaded Supabase configuration\n`);

// Check DNS resolution
exec('nslookup db.qzgwbezcduuqsnkzkkko.supabase.co', (error, stdout, stderr) => {
  if (error) {
    console.warn('⚠️  DNS resolution check failed (non-critical)');
  } else {
    const lines = stdout.split('\n').filter(l => l.includes('Address'));
    console.log(`🔍 DNS resolved to: ${lines.length} address(es)`);
  }

  // Start dev server
  console.log(`\n🚀 Starting Next.js dev server...\n`);
  
  const envVars = { ...process.env };
  
  // Try different DNS strategies
  const strategy = process.argv[2] || 'default';
  
  switch(strategy) {
    case 'ipv4':
      envVars.NODE_OPTIONS = '--dns-result-order=ipv4first';
      console.log('Using: IPv4-first DNS strategy\n');
      break;
    case 'ipv6':
      envVars.NODE_OPTIONS = '--dns-result-order=ipv6first';
      console.log('Using: IPv6-first DNS strategy\n');
      break;
    default:
      console.log('Using: Default DNS resolution\n');
  }

  const nextDev = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
    env: envVars,
  });

  process.on('SIGINT', () => {
    console.log('\n\n📦 Restoring backup .env.local...');
    const backup = envLocalFile + '.backup';
    if (fs.existsSync(backup)) {
      fs.copyFileSync(backup, envLocalFile);
      console.log('✅ Restored');
    }
    process.exit(0);
  });

  nextDev.on('exit', (code) => {
    console.log(`\n\n📦 Restoring backup .env.local...`);
    const backup = envLocalFile + '.backup';
    if (fs.existsSync(backup)) {
      fs.copyFileSync(backup, envLocalFile);
      console.log('✅ Restored');
    }
    process.exit(code);
  });
});
