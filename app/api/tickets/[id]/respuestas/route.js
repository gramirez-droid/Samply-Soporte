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

  // Mismo criterio de ownership que el resto de la API de cliente: solo
  // puede ver respuestas de un ticket que le pertenece a él.
  const { rows: ticketRows } = await query(
    `SELECT id FROM tickets WHERE id = $1 AND cliente_id = $2`,
    [id, session.clienteId]
  );
  if (!ticketRows[0]) {
    return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
  }

  const { rows } = await query(
    `SELECT r.id, r.mensaje, r.created_at, a.nombre AS agente_nombre
     FROM tickets_respuestas r
     LEFT JOIN agentes a ON a.id = r.agente_id
     WHERE r.ticket_id = $1
     ORDER BY r.created_at ASC`,
    [id]
  );

  return NextResponse.json({ respuestas: rows });
}
