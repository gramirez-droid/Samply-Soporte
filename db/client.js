import { Pool } from 'pg';

// Reusamos el pool entre invocaciones (Next.js recicla el módulo en dev con HMR,
// por eso lo colgamos de globalThis para no abrir un pool nuevo en cada reload).
let pool = globalThis.__samply_pg_pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('Falta DATABASE_URL en las variables de entorno.');
    }
    const ssl = process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false };
    pool = new Pool({ connectionString, ssl });
    globalThis.__samply_pg_pool = pool;
  }
  return pool;
}

export function query(text, params) {
  return getPool().query(text, params);
}
