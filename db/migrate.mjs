// Runner de migraciones versionadas.
//
// - Aplica, en orden, los archivos db/migrations/NNNN_nombre.sql que todavía
//   no figuran en la tabla schema_migrations.
// - Cada archivo corre en su propia transacción: o se aplica entero o no se
//   aplica nada (y el deploy se frena).
// - Un advisory lock evita que dos procesos migren a la vez.
// - Base existente sin control de versiones (producción al 2026-10-08):
//   se marca 0001_baseline como aplicada SIN ejecutarla, y se sigue desde 0002.
//
// Uso local:   npm run db:migrate          (lee .env)
// En Netlify:  corre solo en cada build (ver "build" en package.json).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const BASELINE = '0001_baseline';
const LOCK_ID = 7_310_442; // número arbitrario, fijo, para pg_advisory_lock

function listarMigraciones() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_[\w-]+\.sql$/.test(f))
    .sort()
    .map((f) => ({ version: f.replace(/\.sql$/, ''), archivo: path.join(MIGRATIONS_DIR, f) }));
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[migrate] Falta DATABASE_URL. Local: completá .env. Netlify: revisá que la variable tenga scope "Builds".');
    process.exit(1);
  }

  const ssl = process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false };
  const client = new pg.Client({ connectionString, ssl });
  await client.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version     VARCHAR(255) PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows: aplicadasRows } = await client.query('SELECT version FROM schema_migrations');
    const aplicadas = new Set(aplicadasRows.map((r) => r.version));

    // Base que ya existía antes de este sistema: adoptamos el baseline.
    if (aplicadas.size === 0) {
      const { rows } = await client.query(`SELECT to_regclass('public.tickets') IS NOT NULL AS existe`);
      if (rows[0].existe) {
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [BASELINE]);
        aplicadas.add(BASELINE);
        console.log(`[migrate] Base existente detectada → ${BASELINE} marcada como aplicada (no se ejecutó).`);
      }
    }

    const pendientes = listarMigraciones().filter((m) => !aplicadas.has(m.version));
    if (pendientes.length === 0) {
      console.log('[migrate] Nada pendiente, la base está al día.');
      return;
    }

    for (const m of pendientes) {
      const sql = fs.readFileSync(m.archivo, 'utf-8');
      process.stdout.write(`[migrate] Aplicando ${m.version}... `);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [m.version]);
        await client.query('COMMIT');
        console.log('ok');
      } catch (err) {
        await client.query('ROLLBACK');
        console.log('ERROR');
        throw new Error(`${m.version}: ${err.message}`);
      }
    }
    console.log(`[migrate] Listo — ${pendientes.length} migración(es) aplicada(s).`);
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    await client.end();
  }
}

main().catch((err) => {
  console.error('[migrate] Falló:', err.message);
  console.error('[migrate] No se aplicó nada de esa migración (rollback). El deploy se frena acá.');
  process.exit(1);
});
