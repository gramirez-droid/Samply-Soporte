import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';
import { ticketAdminCompleto } from '@/lib/tickets';

export async function DELETE(req, { params }) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const id = Number(params.id);
  const agenteId = Number(params.agenteId);
  if (!Number.isInteger(id) || !Number.isInteger(agenteId)) {
    return NextResponse.json({ error: 'Id inválido' }, { status: 400 });
  }

  const { rows: agenteRows } = await query('SELECT nombre FROM agentes WHERE id = $1', [agenteId]);
  const nombreAgente = agenteRows[0]?.nombre || `Agente #${agenteId}`;

  const { rowCount } = await query(
    'DELETE FROM tickets_agentes WHERE ticket_id = $1 AND agente_id = $2',
    [id, agenteId]
  );

  if (rowCount > 0) {
    await query(
      `INSERT INTO tickets_historial (ticket_id, campo, valor_anterior, valor_nuevo)
       VALUES ($1, 'agente', $2, 'Quitado')`,
      [id, nombreAgente]
    );
  }

  const ticket = await ticketAdminCompleto(id);
  if (!ticket) {
    return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ ticket });
}
