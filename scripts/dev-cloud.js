#!/usr/bin/env node
/**
 * Load environment configuration for Supabase cloud development
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
console.log(`🚀 Starting development server with CLOUD DATABASE (PostgreSQL/Supabase)\n`);

// Start next dev
const nextDev = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
});

nextDev.on('exit', (code) => {
  console.log(`\nDevelopment server exited with code ${code}`);
  process.exit(code);
});
