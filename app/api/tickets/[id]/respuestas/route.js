import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getSessionFromRequest } from '@/lib/auth';
import { notificarRespuestaClienteAAdmins } from '@/lib/email';
import { RESPUESTA_SELECT, validarContenidoRespuesta, textoParaEmail } from '@/lib/respuestas';

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
  // puede ver respuestas de un ticket que pertenece a SU empresa (no solo
  // a él — todos los usuarios de la empresa comparten los mismos tickets).
  const { rows: ticketRows } = await query(
    `SELECT id FROM tickets WHERE id = $1 AND cliente_id = $2`,
    [id, session.clienteId]
  );
  if (!ticketRows[0]) {
    return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
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
  const session = await getSessionFromRequest(req);
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

  const { rows: ticketRows } = await query(
    `SELECT id, codigo, asunto, estado FROM tickets WHERE id = $1 AND cliente_id = $2`,
    [id, session.clienteId]
  );
  const ticket = ticketRows[0];
  if (!ticket) {
    return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
  }

  const { rows } = await query(
    `INSERT INTO tickets_respuestas (ticket_id, usuario_id, mensaje, audio_url, audio_duracion_seg, adjunto_url, adjunto_nombre)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, mensaje, audio_url, audio_duracion_seg, adjunto_url, adjunto_nombre, created_at`,
    [id, session.usuarioId, mensaje, audioUrl, audioDuracion, adjuntoUrl, adjuntoNombre]
  );

  const respuesta = { ...rows[0], agente_nombre: null, usuario_nombre: session.nombre };

  // Si el ticket estaba "Esperando cliente" y justo el cliente responde,
  // lo volvemos a "En progreso" solo — así no se pierde que hay algo nuevo
  // para que el staff revise. No tocamos ningún otro estado.
  if (ticket.estado === 'Esperando cliente') {
    await query(`UPDATE tickets SET estado = 'En progreso', updated_at = now() WHERE id = $1`, [id]);
    await query(
      `INSERT INTO tickets_historial (ticket_id, campo, valor_anterior, valor_nuevo)
       VALUES ($1, 'estado', 'Esperando cliente', 'En progreso (respondió el cliente)')`,
      [id]
    );
  }

  const notif = await notificarRespuestaClienteAAdmins(ticket, session.clienteNombre, session.nombre, textoParaEmail(mensaje, audioDuracion, !!audioUrl, adjuntoNombre)).catch((err) => ({
    enviado: false,
    motivo: err.message,
  }));
  if (!notif.enviado) {
    console.log('[email] No se notificó al staff de la respuesta del cliente:', notif.motivo);
  }

  return NextResponse.json({ respuesta }, { status: 201 });
}
