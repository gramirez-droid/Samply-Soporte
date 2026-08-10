// Corre schema.sql contra la DB apuntada por DATABASE_URL.
// Uso: npm run db:migrate  (lee .env vía dotenv)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Falta DATABASE_URL. Copiá .env.example a .env y completá la connection string.');
    process.exit(1);
  }

  const ssl = process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false };
  const client = new pg.Client({ connectionString, ssl });

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');

  try {
    await client.connect();
    console.log('Conectado a la base. Aplicando schema.sql...');
    await client.query(sql);
    console.log('Listo — tablas clientes y tickets creadas (o ya existían).');
  } catch (err) {
    console.error('Error corriendo la migración:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
