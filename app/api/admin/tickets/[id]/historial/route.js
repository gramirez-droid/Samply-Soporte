import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';

export async function GET(req, { params }) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Id inválido' }, { status: 400 });
  }

  const { rows } = await query(
    `SELECT id, campo, valor_anterior, valor_nuevo, changed_at
     FROM tickets_historial
     WHERE ticket_id = $1
     ORDER BY changed_at ASC`,
    [id]
  );

  return NextResponse.json({ historial: rows });
}
