import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getSessionFromRequest } from '@/lib/auth';

const ESTADOS = ['Nuevo', 'Asignado', 'En progreso', 'Esperando cliente', 'Resuelto', 'Cerrado'];
const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'];

const SELECT_FIELDS = `
  id, codigo, asunto, descripcion, categoria, modulo, prioridad, estado,
  fecha_creacion, ai_resumen, notion_page_id, primera_respuesta_en, resuelto_en
`;

export async function PATCH(req, { params }) {
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

  if (body.estado !== undefined && !ESTADOS.includes(body.estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }
  if (body.prioridad !== undefined && !PRIORIDADES.includes(body.prioridad)) {
    return NextResponse.json({ error: 'Prioridad inválida' }, { status: 400 });
  }
  if (body.estado === undefined && body.prioridad === undefined) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
  }

  // Traemos el ticket actual primero: lo necesitamos para (a) confirmar que
  // es del cliente logueado, (b) saber los valores viejos para el historial,
  // y (c) decidir si corresponde marcar primera_respuesta_en/resuelto_en.
  const { rows: actualRows } = await query(
    `SELECT estado, prioridad, primera_respuesta_en, resuelto_en
     FROM tickets WHERE id = $1 AND cliente_id = $2`,
    [id, session.clienteId]
  );
  const actual = actualRows[0];
  if (!actual) {
    return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
  }

  const nuevoEstado = body.estado !== undefined ? body.estado : actual.estado;
  const nuevaPrioridad = body.prioridad !== undefined ? body.prioridad : actual.prioridad;

  // SLA estilo iTop: TTO (primera vez que sale de "Nuevo") y TTR (cuando
  // llega a "Resuelto"). Solo se setean la primera vez — no se pisan.
  const primeraRespuesta =
    nuevoEstado !== 'Nuevo' && !actual.primera_respuesta_en ? new Date() : actual.primera_respuesta_en;
  const resuelto =
    nuevoEstado === 'Resuelto' && !actual.resuelto_en ? new Date() : actual.resuelto_en;

  const { rows } = await query(
    `UPDATE tickets
     SET estado = $1, prioridad = $2, primera_respuesta_en = $3, resuelto_en = $4, updated_at = now()
     WHERE id = $5 AND cliente_id = $6
     RETURNING ${SELECT_FIELDS}`,
    [nuevoEstado, nuevaPrioridad, primeraRespuesta, resuelto, id, session.clienteId]
  );

  // Historial: una fila por cada campo que efectivamente cambió de valor.
  const cambios = [];
  if (body.estado !== undefined && body.estado !== actual.estado) {
    cambios.push(['estado', actual.estado, body.estado]);
  }
  if (body.prioridad !== undefined && body.prioridad !== actual.prioridad) {
    cambios.push(['prioridad', actual.prioridad, body.prioridad]);
  }
  for (const [campo, valorAnterior, valorNuevo] of cambios) {
    await query(
      `INSERT INTO tickets_historial (ticket_id, campo, valor_anterior, valor_nuevo)
       VALUES ($1, $2, $3, $4)`,
      [id, campo, valorAnterior, valorNuevo]
    );
  }

  return NextResponse.json({ ticket: rows[0] });
}
