// Crea un cliente demo para poder probar el login sin depender de un alta real.
// Uso: npm run db:seed
import pg from 'pg';
import bcrypt from 'bcryptjs';

const DEMO_EMAIL = process.env.SEED_EMAIL || 'demo@distribuidoramodelo.com';
const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'samply123';
const DEMO_NOMBRE = process.env.SEED_NOMBRE || 'Distribuidora Modelo';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Falta DATABASE_URL. Copiá .env.example a .env y completá la connection string.');
    process.exit(1);
  }
  const ssl = process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false };
  const client = new pg.Client({ connectionString, ssl });

  try {
    await client.connect();
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    await client.query(
      `INSERT INTO clientes (nombre, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [DEMO_NOMBRE, DEMO_EMAIL, hash]
    );
    console.log('Cliente demo listo:');
    console.log('  email:', DEMO_EMAIL);
    console.log('  password:', DEMO_PASSWORD);
  } catch (err) {
    console.error('Error en el seed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
