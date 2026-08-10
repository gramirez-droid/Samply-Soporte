import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';
import { ticketAdminCompleto } from '@/lib/tickets';

export async function POST(req, { params }) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Id inválido' }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const agenteId = Number(body.agenteId);
  if (!Number.isInteger(agenteId)) {
    return NextResponse.json({ error: 'agenteId inválido' }, { status: 400 });
  }

  const { rows: ticketRows } = await query('SELECT id FROM tickets WHERE id = $1', [id]);
  if (!ticketRows[0]) {
    return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
  }

  const { rows: agenteRows } = await query('SELECT nombre FROM agentes WHERE id = $1 AND activo = true', [agenteId]);
  const agente = agenteRows[0];
  if (!agente) {
    return NextResponse.json({ error: 'Agente inválido o inactivo' }, { status: 400 });
  }

  // ON CONFLICT DO NOTHING: si ya estaba asignado, no rompe ni duplica.
  const { rowCount } = await query(
    `INSERT INTO tickets_agentes (ticket_id, agente_id) VALUES ($1, $2)
     ON CONFLICT (ticket_id, agente_id) DO NOTHING`,
    [id, agenteId]
  );

  if (rowCount > 0) {
    await query(
      `INSERT INTO tickets_historial (ticket_id, campo, valor_anterior, valor_nuevo)
       VALUES ($1, 'agente', NULL, $2)`,
      [id, agente.nombre]
    );
  }

  const ticket = await ticketAdminCompleto(id);
  return NextResponse.json({ ticket });
}
