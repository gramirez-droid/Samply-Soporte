import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';

export async function GET(req) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { rows } = await query(
    `SELECT id, nombre, email FROM agentes WHERE activo = true ORDER BY nombre`
  );
  return NextResponse.json({ agentes: rows });
}
