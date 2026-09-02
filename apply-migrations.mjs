/**
 * Applies SQL files in supabase/migrations/ in filename order (Postgres).
 * Requires a direct Postgres connection string (not the anon key).
 *
 * Add to .env (do not commit):
 *   DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@db.[ref].supabase.co:5432/postgres
 *
 * Then: npm run db:apply-migrations
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const migrationsDir = path.join(root, 'supabase', 'migrations');

function loadDatabaseUrlFromEnvFiles() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const m = trimmed.match(/^DATABASE_URL=(.+)$/);
      if (m) {
        let v = m[1].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        process.env.DATABASE_URL = v;
        return;
      }
    }
  }
}

loadDatabaseUrlFromEnvFiles();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    'Missing DATABASE_URL. Add it to .env (see Supabase → Project Settings → Database → Connection string → URI).'
  );
  process.exit(1);
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes('supabase') ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  await client.connect();
  console.log('Applying', files.length, 'migration(s)...');
  for (const file of files) {
    const full = path.join(migrationsDir, file);
    const sql = fs.readFileSync(full, 'utf8');
    console.log(' →', file);
    await client.query(sql);
  }
  await client.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
