import { query } from '@/db/client';
import { buscarTicketsValidadosEnNotion } from './notion';

// Días que un ticket queda en "Resuelto" esperando confirmación del cliente
// antes de autocerrarse. Definido por Gonzalo.
export const CIERRE_AUTOMATICO_DIAS = 3;

// Campos + subquery de agentes asignados (muchos a muchos), reusado por
// GET /api/admin/tickets, PATCH /api/admin/tickets/:id y los endpoints de
// agregar/quitar agente — así todos devuelven el ticket con la misma forma.
export const TICKET_ADMIN_SELECT = `
  t.id, t.codigo, t.asunto, t.descripcion, t.categoria, t.modulo, t.prioridad, t.estado,
  t.fecha_creacion, t.ai_resumen, t.notion_page_id, t.primera_respuesta_en, t.resuelto_en,
  t.cliente_id, c.nombre AS cliente_nombre,
  t.usuario_id, uc.nombre AS usuario_nombre,
  COALESCE(
    (SELECT json_agg(json_build_object('id', a.id, 'nombre', a.nombre) ORDER BY a.nombre)
     FROM tickets_agentes ta JOIN agentes a ON a.id = ta.agente_id
     WHERE ta.ticket_id = t.id),
    '[]'
  ) AS agentes
`;

/** Trae un ticket puntual con cliente + agentes asignados (o null si no existe). */
export async function ticketAdminCompleto(id) {
  const { rows } = await query(
    `SELECT ${TICKET_ADMIN_SELECT}
     FROM tickets t
     JOIN clientes c ON c.id = t.cliente_id
     LEFT JOIN usuarios_cliente uc ON uc.id = t.usuario_id
     WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function _cerrarVencidos(whereExtra, params) {
  const { rows } = await query(
    `UPDATE tickets
     SET estado = 'Cerrado', updated_at = now()
     WHERE estado = 'Resuelto'
       AND resuelto_en <= now() - INTERVAL '${CIERRE_AUTOMATICO_DIAS} days'
       ${whereExtra}
     RETURNING id`,
    params
  );

  for (const row of rows) {
    await query(
      `INSERT INTO tickets_historial (ticket_id, campo, valor_anterior, valor_nuevo)
       VALUES ($1, 'estado', 'Resuelto', 'Cerrado (automático)')`,
      [row.id]
    );
  }

  return rows.length;
}

/**
 * Cierra automáticamente los tickets "Resueltos" de UN cliente que ya
 * pasaron el plazo de confirmación (sin infraestructura de cron todavía:
 * se corre como chequeo perezoso en cada lectura de tickets). Registra el
 * cambio en el historial como cualquier otro, para que quede trazable que
 * fue automático. Usado por el panel de cliente (GET /api/tickets).
 */
export async function cerrarTicketsVencidos(clienteId) {
  return _cerrarVencidos('AND cliente_id = $1', [clienteId]);
}

/**
 * Igual que cerrarTicketsVencidos, pero sin filtrar por cliente — para el
 * panel de staff, que ve tickets de todos los clientes.
 */
export async function cerrarTicketsVencidosGlobal() {
  return _cerrarVencidos('', []);
}

/**
 * Trae de Notion las pages marcadas "Validación Customer" y refleja ese
 * estado como "Resuelto" en los tickets correspondientes (matcheados por
 * notion_page_id). Es la sync reversa del flujo que pediste: vos marcás
 * en Notion, y acá se actualiza solo.
 *
 * Sin cron todavía — hay que dispararla manualmente desde el panel de
 * staff (botón "Sincronizar con Notion") o llamando a
 * POST /api/admin/notion/sync. El próximo paso natural es un Vercel Cron
 * Job que la llame cada X minutos.
 */
export async function sincronizarResueltosDesdeNotion() {
  const pages = await buscarTicketsValidadosEnNotion();
  let actualizados = 0;

  for (const page of pages) {
    const { rows } = await query(`SELECT id, estado FROM tickets WHERE notion_page_id = $1`, [page.id]);
    const ticket = rows[0];
    if (!ticket || ['Resuelto', 'Cerrado'].includes(ticket.estado)) continue;

    await query(
      `UPDATE tickets
       SET estado = 'Resuelto', resuelto_en = COALESCE(resuelto_en, now()), updated_at = now()
       WHERE id = $1`,
      [ticket.id]
    );
    await query(
      `INSERT INTO tickets_historial (ticket_id, campo, valor_anterior, valor_nuevo)
       VALUES ($1, 'estado', $2, 'Resuelto (vía Notion)')`,
      [ticket.id, ticket.estado]
    );
    actualizados++;
  }

  return actualizados;
}
