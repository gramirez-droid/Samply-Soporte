import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';
import { crearTicketEnNotion } from '@/lib/notion';

const ESTADOS = ['Nuevo', 'Asignado', 'En progreso', 'Esperando cliente', 'Resuelto', 'Cerrado'];
const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'];

const SELECT_FIELDS = `
  t.id, t.codigo, t.asunto, t.descripcion, t.categoria, t.modulo, t.prioridad, t.estado,
  t.fecha_creacion, t.ai_resumen, t.notion_page_id, t.primera_respuesta_en, t.resuelto_en,
  t.cliente_id, c.nombre AS cliente_nombre,
  t.agente_id, a.nombre AS agente_nombre
`;

async function ticketConJoins(id) {
  const { rows } = await query(
    `SELECT ${SELECT_FIELDS}
     FROM tickets t
     JOIN clientes c ON c.id = t.cliente_id
     LEFT JOIN agentes a ON a.id = t.agente_id
     WHERE t.id = $1`,
    [id]
  );
  return rows[0];
}

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
  if (body.agenteId !== undefined && body.agenteId !== null && !Number.isInteger(body.agenteId)) {
    return NextResponse.json({ error: 'agenteId inválido' }, { status: 400 });
  }
  if (body.estado === undefined && body.prioridad === undefined && body.agenteId === undefined) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
  }

  // Acá no filtramos por cliente_id (a diferencia del panel de cliente):
  // el staff puede tocar tickets de cualquier distribuidora.
  const actual = await ticketConJoins(id);
  if (!actual) {
    return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
  }

  let nombreAgenteNuevo = actual.agente_nombre;
  if (body.agenteId !== undefined) {
    if (body.agenteId === null) {
      nombreAgenteNuevo = null;
    } else {
      const { rows: agenteRows } = await query('SELECT nombre FROM agentes WHERE id = $1 AND activo = true', [body.agenteId]);
      if (!agenteRows[0]) {
        return NextResponse.json({ error: 'Agente inválido o inactivo' }, { status: 400 });
      }
      nombreAgenteNuevo = agenteRows[0].nombre;
    }
  }

  const nuevoEstado = body.estado !== undefined ? body.estado : actual.estado;
  const nuevaPrioridad = body.prioridad !== undefined ? body.prioridad : actual.prioridad;
  const nuevoAgenteId = body.agenteId !== undefined ? body.agenteId : actual.agente_id;

  // SLA: TTO al primer estado distinto de "Nuevo", TTR al llegar a "Resuelto".
  const primeraRespuesta =
    nuevoEstado !== 'Nuevo' && !actual.primera_respuesta_en ? new Date() : actual.primera_respuesta_en;
  const resuelto = nuevoEstado === 'Resuelto' && !actual.resuelto_en ? new Date() : actual.resuelto_en;

  // Notion: al entrar a "En progreso" por primera vez, se crea la page allá.
  let notionPageId = actual.notion_page_id;
  if (nuevoEstado === 'En progreso' && !notionPageId) {
    try {
      const creado = await crearTicketEnNotion(actual, actual.cliente_nombre);
      if (creado) notionPageId = creado;
    } catch (err) {
      // No bloqueamos el cambio de estado si Notion falla — solo lo logueamos.
      console.error('[notion] Error creando la page:', err.message);
    }
  }

  await query(
    `UPDATE tickets
     SET estado = $1, prioridad = $2, agente_id = $3, primera_respuesta_en = $4,
         resuelto_en = $5, notion_page_id = $6, updated_at = now()
     WHERE id = $7`,
    [nuevoEstado, nuevaPrioridad, nuevoAgenteId, primeraRespuesta, resuelto, notionPageId, id]
  );

  // Historial: una fila por cada campo que efectivamente cambió.
  const cambios = [];
  if (body.estado !== undefined && body.estado !== actual.estado) {
    cambios.push(['estado', actual.estado, body.estado]);
  }
  if (body.prioridad !== undefined && body.prioridad !== actual.prioridad) {
    cambios.push(['prioridad', actual.prioridad, body.prioridad]);
  }
  if (body.agenteId !== undefined && body.agenteId !== actual.agente_id) {
    cambios.push(['agente', actual.agente_nombre || 'Sin asignar', nombreAgenteNuevo || 'Sin asignar']);
  }
  for (const [campo, valorAnterior, valorNuevo] of cambios) {
    await query(
      `INSERT INTO tickets_historial (ticket_id, campo, valor_anterior, valor_nuevo)
       VALUES ($1, $2, $3, $4)`,
      [id, campo, valorAnterior, valorNuevo]
    );
  }

  const actualizado = await ticketConJoins(id);
  return NextResponse.json({ ticket: actualizado });
}
