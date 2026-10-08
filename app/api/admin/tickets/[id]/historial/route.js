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
    `SELECT h.id, h.campo, h.valor_anterior, h.valor_nuevo, h.changed_at, a.nombre AS autor_nombre
     FROM tickets_historial h
     LEFT JOIN agentes a ON a.id = h.agente_id
     WHERE h.ticket_id = $1
     ORDER BY h.changed_at ASC`,
    [id]
  );

  return NextResponse.json({ historial: rows });
}
