import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';
import { cerrarTicketsVencidosGlobal } from '@/lib/tickets';

const SELECT_FIELDS = `
  t.id, t.codigo, t.asunto, t.descripcion, t.categoria, t.modulo, t.prioridad, t.estado,
  t.fecha_creacion, t.ai_resumen, t.notion_page_id, t.primera_respuesta_en, t.resuelto_en,
  t.cliente_id, c.nombre AS cliente_nombre,
  t.agente_id, a.nombre AS agente_nombre
`;

export async function GET(req) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // A diferencia del panel de cliente, aquí no hay cliente_id para filtrar
  // — el staff ve los tickets de todas las distribuidoras.
  await cerrarTicketsVencidosGlobal();

  const { rows } = await query(
    `SELECT ${SELECT_FIELDS}
     FROM tickets t
     JOIN clientes c ON c.id = t.cliente_id
     LEFT JOIN agentes a ON a.id = t.agente_id
     ORDER BY t.fecha_creacion DESC`
  );
  return NextResponse.json({ tickets: rows });
}
