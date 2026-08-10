// Carga los agentes de soporte iniciales.
// Uso: npm run db:seed:agentes
//
// La contraseña por defecto es igual al email en minúscula sin dominio +
// "123" (ej: tomas123) — solo para arrancar. Cambiala apenas puedan loguear.
import pg from 'pg';
import bcrypt from 'bcryptjs';

const AGENTES = [
  { nombre: 'Tomás Martínez Paisa', email: 'tomas.martinez@samply.com', password: 'tomas123' },
  { nombre: 'Ignacio Ghiorzi', email: 'ignacio.ghiorzi@samply.com', password: 'ignacio123' },
  { nombre: 'Gonzalo Ramirez', email: 'gonzalo.ramirez@samply.com', password: 'gonzalo123' },
];

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
    for (const a of AGENTES) {
      const hash = await bcrypt.hash(a.password, 10);
      await client.query(
        `INSERT INTO agentes (nombre, email, password_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre`,
        [a.nombre, a.email, hash]
      );
      console.log(`  ${a.nombre} — ${a.email} / ${a.password}`);
    }
    console.log(`Listo — ${AGENTES.length} agentes cargados (o actualizados).`);
    console.log('Cambiá estas contraseñas antes de usar esto en serio.');
  } catch (err) {
    console.error('Error en el seed de agentes:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
