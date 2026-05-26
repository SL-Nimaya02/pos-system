#!/usr/bin/env node
/**
 * Fixed dev-cloud script with DNS/IPv6 workarounds for Supabase
 * Usage: npm run dev:cloud
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const envFile = path.join(__dirname, '..', '.env.local.supabase');
const envLocalFile = path.join(__dirname, '..', '.env.local');

// Backup current .env.local if it exists
if (fs.existsSync(envLocalFile)) {
  const backup = envLocalFile + '.backup';
  fs.copyFileSync(envLocalFile, backup);
  console.log(`📦 Backed up current .env.local to .env.local.backup`);
}

// Copy Supabase env file to .env.local
fs.copyFileSync(envFile, envLocalFile);
console.log(`☁️  Loaded Supabase configuration (.env.local.supabase → .env.local)`);

// Add DNS workaround for IPv6 issues
const envVars = {
  ...process.env,
  // Force IPv4-first DNS resolution
  NODE_OPTIONS: '--dns-result-order=ipv4first',
  // Alternative: Set DNS servers explicitly (optional)
  // NODE_EXTRA_CA_CERTS: undefined,
};

console.log(`🔧 Applied DNS workaround for Supabase connectivity`);
console.log(`🚀 Starting development server with CLOUD DATABASE (PostgreSQL/Supabase)\n`);

// Start next dev with environment variables
const nextDev = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
  env: envVars,
});

nextDev.on('exit', (code) => {
  console.log(`\nDevelopment server exited with code ${code}`);
  process.exit(code);
});

nextDev.on('error', (err) => {
  console.error(`Failed to start dev server: ${err.message}`);
  process.exit(1);
});
