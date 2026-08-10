import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';
import { crearTicketEnNotion } from '@/lib/notion';
import { ticketAdminCompleto } from '@/lib/tickets';

const ESTADOS = ['Nuevo', 'Asignado', 'En progreso', 'Esperando cliente', 'Resuelto', 'Cerrado'];
const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'];

export async function PATCH(req, { params }) {
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

  if (body.estado !== undefined && !ESTADOS.includes(body.estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }
  if (body.prioridad !== undefined && !PRIORIDADES.includes(body.prioridad)) {
    return NextResponse.json({ error: 'Prioridad inválida' }, { status: 400 });
  }
  if (body.estado === undefined && body.prioridad === undefined) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
  }

  // Este PATCH ya no maneja el agente asignado — eso vive en
  // /api/admin/tickets/:id/agentes (POST agrega, DELETE quita), porque un
  // ticket puede tener varios agentes a la vez, no uno solo.
  const { rows: actualRows } = await query(
    `SELECT codigo, estado, prioridad, primera_respuesta_en, resuelto_en, notion_page_id, ai_resumen,
            asunto, categoria, modulo, cliente_id
     FROM tickets WHERE id = $1`,
    [id]
  );
  const actual = actualRows[0];
  if (!actual) {
    return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
  }

  const nuevoEstado = body.estado !== undefined ? body.estado : actual.estado;
  const nuevaPrioridad = body.prioridad !== undefined ? body.prioridad : actual.prioridad;

  const primeraRespuesta =
    nuevoEstado !== 'Nuevo' && !actual.primera_respuesta_en ? new Date() : actual.primera_respuesta_en;
  const resuelto = nuevoEstado === 'Resuelto' && !actual.resuelto_en ? new Date() : actual.resuelto_en;

  let notionPageId = actual.notion_page_id;
  if (nuevoEstado === 'En progreso' && !notionPageId) {
    try {
      const { rows: clienteRows } = await query('SELECT nombre FROM clientes WHERE id = $1', [actual.cliente_id]);
      const clienteNombre = clienteRows[0]?.nombre || '';
      const creado = await crearTicketEnNotion(
        { id, codigo: actual.codigo, asunto: actual.asunto, categoria: actual.categoria, modulo: actual.modulo, prioridad: nuevaPrioridad, ai_resumen: actual.ai_resumen },
        clienteNombre
      );
      if (creado) notionPageId = creado;
    } catch (err) {
      console.error('[notion] Error creando la page:', err.message);
    }
  }

  await query(
    `UPDATE tickets
     SET estado = $1, prioridad = $2, primera_respuesta_en = $3, resuelto_en = $4, notion_page_id = $5, updated_at = now()
     WHERE id = $6`,
    [nuevoEstado, nuevaPrioridad, primeraRespuesta, resuelto, notionPageId, id]
  );

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

  const actualizado = await ticketAdminCompleto(id);
  return NextResponse.json({ ticket: actualizado });
}
