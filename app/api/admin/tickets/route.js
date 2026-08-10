import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';
import { cerrarTicketsVencidosGlobal, TICKET_ADMIN_SELECT } from '@/lib/tickets';

export async function GET(req) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // A diferencia del panel de cliente, aquí no hay cliente_id para filtrar
  // — el staff ve los tickets de todas las distribuidoras.
  await cerrarTicketsVencidosGlobal();

  const { rows } = await query(
    `SELECT ${TICKET_ADMIN_SELECT}
     FROM tickets t
     JOIN clientes c ON c.id = t.cliente_id
     LEFT JOIN usuarios_cliente uc ON uc.id = t.usuario_id
     ORDER BY t.fecha_creacion DESC`
  );
  return NextResponse.json({ tickets: rows });
}
