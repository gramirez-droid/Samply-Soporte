import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';
import { notificarRespuestaAlCliente } from '@/lib/email';

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
    `SELECT r.id, r.mensaje, r.created_at, a.nombre AS agente_nombre
     FROM tickets_respuestas r
     LEFT JOIN agentes a ON a.id = r.agente_id
     WHERE r.ticket_id = $1
     ORDER BY r.created_at ASC`,
    [id]
  );

  return NextResponse.json({ respuestas: rows });
}

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

  const mensaje = (body.mensaje || '').trim();
  if (!mensaje) {
    return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 });
  }

  // Traemos el ticket + email del cliente para poder mandar la notificación.
  const { rows: ticketRows } = await query(
    `SELECT t.id, t.codigo, t.asunto, c.email AS cliente_email
     FROM tickets t
     JOIN clientes c ON c.id = t.cliente_id
     WHERE t.id = $1`,
    [id]
  );
  const ticket = ticketRows[0];
  if (!ticket) {
    return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
  }

  const { rows } = await query(
    `INSERT INTO tickets_respuestas (ticket_id, agente_id, mensaje)
     VALUES ($1, $2, $3)
     RETURNING id, mensaje, created_at`,
    [id, session.agenteId, mensaje]
  );

  const respuesta = { ...rows[0], agente_nombre: session.nombre };

  // Igual que con los emails de creación de ticket: esperamos el envío para
  // que no se corte a mitad de camino en serverless, pero si falla no
  // rompe la creación de la respuesta.
  const notif = await notificarRespuestaAlCliente(ticket, ticket.cliente_email, mensaje, session.nombre).catch((err) => ({
    enviado: false,
    motivo: err.message,
  }));
  if (!notif.enviado) {
    console.log('[email] No se notificó al cliente de la respuesta:', notif.motivo);
  }

  return NextResponse.json({ respuesta }, { status: 201 });
}
