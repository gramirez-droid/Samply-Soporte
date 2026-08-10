import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const modulo = searchParams.get('modulo');
  const rol = searchParams.get('rol');

  const conditions = [];
  const values = [];
  let i = 1;

  if (modulo) {
    conditions.push(`modulo = $${i++}`);
    values.push(modulo);
  }
  if (rol) {
    conditions.push(`rol = $${i++}`);
    values.push(rol);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT id, titulo, descripcion, modulo, rol, archivo_url, created_at
     FROM manuales ${where}
     ORDER BY modulo, titulo`,
    values
  );

  return NextResponse.json({ manuales: rows });
}
