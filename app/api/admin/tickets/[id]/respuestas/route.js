import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';
import { notificarRespuestaAlCliente } from '@/lib/email';
import { RESPUESTA_SELECT, validarContenidoRespuesta, textoParaEmail } from '@/lib/respuestas';

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
    `SELECT ${RESPUESTA_SELECT}
     FROM tickets_respuestas r
     LEFT JOIN agentes a ON a.id = r.agente_id
     LEFT JOIN usuarios_cliente uc ON uc.id = r.usuario_id
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

  const contenido = validarContenidoRespuesta(body);
  if (!contenido.ok) {
    return NextResponse.json({ error: contenido.error }, { status: 400 });
  }
  const { mensaje, audioUrl, audioDuracion, adjuntoUrl, adjuntoNombre } = contenido;

  // El email del cliente vive en usuarios_cliente (no en clientes) — le
  // avisamos puntualmente a quien levantó ESTE ticket, no a toda la empresa.
  const { rows: ticketRows } = await query(
    `SELECT t.id, t.codigo, t.asunto, uc.email AS usuario_email
     FROM tickets t
     LEFT JOIN usuarios_cliente uc ON uc.id = t.usuario_id
     WHERE t.id = $1`,
    [id]
  );
  const ticket = ticketRows[0];
  if (!ticket) {
    return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
  }

  const { rows } = await query(
    `INSERT INTO tickets_respuestas (ticket_id, agente_id, mensaje, audio_url, audio_duracion_seg, adjunto_url, adjunto_nombre)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, mensaje, audio_url, audio_duracion_seg, adjunto_url, adjunto_nombre, created_at`,
    [id, session.agenteId, mensaje, audioUrl, audioDuracion, adjuntoUrl, adjuntoNombre]
  );

  const respuesta = { ...rows[0], agente_nombre: session.nombre, usuario_nombre: null };

  // Igual que con los emails de creación de ticket: esperamos el envío para
  // que no se corte a mitad de camino en serverless, pero si falla no
  // rompe la creación de la respuesta.
  if (ticket.usuario_email) {
    const notif = await notificarRespuestaAlCliente(ticket, ticket.usuario_email, textoParaEmail(mensaje, audioDuracion, !!audioUrl, adjuntoNombre), session.nombre).catch((err) => ({
      enviado: false,
      motivo: err.message,
    }));
    if (!notif.enviado) {
      console.log('[email] No se notificó al cliente de la respuesta:', notif.motivo);
    }
  }

  return NextResponse.json({ respuesta }, { status: 201 });
}
