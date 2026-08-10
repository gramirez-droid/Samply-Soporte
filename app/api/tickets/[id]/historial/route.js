import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(req, { params }) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Id inválido' }, { status: 400 });
  }

  // Confirmamos que el ticket es del cliente logueado antes de exponer su
  // historial — mismo criterio de ownership que el resto de la API.
  const { rows: ticketRows } = await query(
    `SELECT id FROM tickets WHERE id = $1 AND cliente_id = $2`,
    [id, session.clienteId]
  );
  if (!ticketRows[0]) {
    return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
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
