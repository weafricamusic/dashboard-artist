#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.join(__dirname, '..');

const { Client } = pg;

// Get environment variables
// Prefer a direct Postgres connection string so we can run raw SQL migrations.
// You can obtain this from Supabase (Project Settings → Database → Connection string).
const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ Missing SUPABASE_DB_URL (or DATABASE_URL).');
  console.error('   This script applies SQL migrations by connecting directly to Postgres.');
  console.error('   Alternative: copy/paste the SQL files in supabase/migrations into the Supabase SQL editor.');
  process.exit(1);
}

const migrationsDir = path.join(projectDir, 'supabase', 'migrations');

function listMigrationFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

function loadMigrationFile(filename) {
  const filepath = path.join(migrationsDir, filename);
  return fs.readFileSync(filepath, 'utf-8');
}

function summarizeError(err) {
  if (!err) return 'Unknown error';
  if (err instanceof Error) return err.message;
  return String(err);
}

async function applyMigrations() {
  console.log('🚀 Applying database migrations...\n');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await client.query(`
      create table if not exists public.schema_migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      );
    `);

    const appliedRes = await client.query('select filename from public.schema_migrations');
    const applied = new Set((appliedRes.rows ?? []).map((r) => r.filename));

    const files = listMigrationFiles();
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log('✅ No pending migrations.');
      return;
    }

    for (const filename of pending) {
      console.log(`⏳ Applying ${filename}...`);
      const sql = loadMigrationFile(filename);

      try {
        await client.query('begin');
        await client.query(sql);
        await client.query('insert into public.schema_migrations (filename) values ($1) on conflict do nothing', [
          filename,
        ]);
        await client.query('commit');
        console.log(`✅ Applied ${filename}`);
      } catch (err) {
        await client.query('rollback');
        console.log(`❌ Failed ${filename}: ${summarizeError(err)}`);
        throw err;
      }
    }

    console.log('\n✅ Migration process completed!');
  } finally {
    await client.end();
  }
}

// Check tables exist after migration
async function verifyTables() {
  console.log('🔍 Verifying tables...\n');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const tables = [
    'live_sessions',
    'subscriptions',
    'user_subscriptions',
    'artist_profiles',
    'payout_requests',
    'uploads',
    'battles',
    'battle_invites',
    'live_invites',
  ];

  try {
    for (const table of tables) {
      try {
        await client.query(`select 1 from public.${table} limit 1`);
        console.log(`✅ ${table}: Exists`);
      } catch {
        console.log(`❌ ${table}: Not found`);
      }
    }
  } finally {
    await client.end();
  }
}

applyMigrations()
  .then(() => verifyTables())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error applying migrations:', err);
    process.exit(1);
  });
