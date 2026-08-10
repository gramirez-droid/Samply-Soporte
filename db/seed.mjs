// Crea una empresa demo + su primer usuario, para poder probar el login
// sin depender de un alta real. Podés correrlo de nuevo si querés sumarle
// un segundo usuario a la misma empresa (usá SEED_EMAIL distinto).
// Uso: npm run db:seed
import pg from 'pg';
import bcrypt from 'bcryptjs';

const DEMO_EMPRESA = process.env.SEED_NOMBRE || 'Distribuidora Modelo';
const DEMO_EMAIL = process.env.SEED_EMAIL || 'demo@distribuidoramodelo.com';
const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'samply123';
const DEMO_USUARIO_NOMBRE = process.env.SEED_USUARIO_NOMBRE || 'Admin Demo';

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

    // 1. La empresa (si ya existe una con ese nombre, la reusamos en vez de duplicar).
    const { rows: existentes } = await client.query('SELECT id FROM clientes WHERE nombre = $1', [DEMO_EMPRESA]);
    let clienteId;
    if (existentes[0]) {
      clienteId = existentes[0].id;
    } else {
      const { rows } = await client.query(
        'INSERT INTO clientes (nombre) VALUES ($1) RETURNING id',
        [DEMO_EMPRESA]
      );
      clienteId = rows[0].id;
    }

    // 2. El usuario de esa empresa.
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    await client.query(
      `INSERT INTO usuarios_cliente (cliente_id, nombre, email, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [clienteId, DEMO_USUARIO_NOMBRE, DEMO_EMAIL, hash]
    );

    console.log('Empresa + usuario demo listos:');
    console.log('  empresa:', DEMO_EMPRESA);
    console.log('  usuario:', DEMO_USUARIO_NOMBRE);
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
