import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getSessionFromRequest } from '@/lib/auth';
import { cerrarTicketsVencidos } from '@/lib/tickets';
import { notificarNuevoTicketAAdmins, confirmarTicketAlCliente } from '@/lib/email';

const CATEGORIAS = ['Bug / error', 'Consulta funcional', 'Integración (ERP)', 'Facturación', 'Capacitación', 'Solicitud de mejora'];
const MODULOS = ['App móvil (Preventa)', 'Televentas', 'B2B eCommerce', 'Inventarios', 'Facturación', 'Reportería / KPIs'];
const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'];

const SELECT_FIELDS = `
  id, codigo, asunto, descripcion, categoria, modulo, prioridad, estado,
  fecha_creacion, ai_resumen, notion_page_id, primera_respuesta_en, resuelto_en
`;

export async function GET(req) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Sin cron todavía (eso llega con el deploy en Vercel): al leer la lista
  // nos asseguramos de que ningún "Resuelto" haya quedado vencido sin
  // pasar a "Cerrado".
  await cerrarTicketsVencidos(session.clienteId);

  const { rows } = await query(
    `SELECT ${SELECT_FIELDS} FROM tickets WHERE cliente_id = $1 ORDER BY fecha_creacion DESC`,
    [session.clienteId]
  );
  return NextResponse.json({ tickets: rows });
}

export async function POST(req) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const asunto = (body.asunto || '').trim();
  const descripcion = (body.descripcion || '').trim();
  const categoria = body.categoria || '';
  const modulo = body.modulo || '';
  const prioridad = body.prioridad || 'Media';

  if (!asunto) {
    return NextResponse.json({ error: 'El asunto es obligatorio' }, { status: 400 });
  }
  if (!CATEGORIAS.includes(categoria)) {
    return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 });
  }
  if (!MODULOS.includes(modulo)) {
    return NextResponse.json({ error: 'Módulo inválido' }, { status: 400 });
  }
  if (!PRIORIDADES.includes(prioridad)) {
    return NextResponse.json({ error: 'Prioridad inválida' }, { status: 400 });
  }

  const { rows: codeRows } = await query(`SELECT 'TCK-' || nextval('ticket_codigo_seq') AS codigo`);
  const codigo = codeRows[0].codigo;

  const { rows } = await query(
    `INSERT INTO tickets (codigo, asunto, descripcion, categoria, modulo, prioridad, estado, cliente_id, usuario_id)
     VALUES ($1, $2, $3, $4, $5, $6, 'Nuevo', $7, $8)
     RETURNING ${SELECT_FIELDS}`,
    [codigo, asunto, descripcion || null, categoria, modulo, prioridad, session.clienteId, session.usuarioId]
  );

  const ticket = rows[0];

  // El adjunto (si el cliente subió uno al crear el ticket) se guarda acá
  // mismo, en la misma request — así el email de aviso ya tiene el link
  // disponible desde el principio, sin depender de una segunda llamada
  // que antes se hacía por separado desde el front.
  const adjunto = body.adjunto;
  if (adjunto?.url && adjunto?.nombre) {
    await query(
      `INSERT INTO tickets_adjuntos (ticket_id, nombre, url, usuario_id) VALUES ($1, $2, $3, $4)`,
      [ticket.id, adjunto.nombre, adjunto.url, session.usuarioId]
    ).catch((err) => console.error('[adjuntos] No se pudo guardar el adjunto del ticket nuevo:', err.message));
  }

  // Dos emails al crear el ticket: uno a los admins de Samply (para que se
  // enteren de que entró algo nuevo, con la descripción completa y el
  // adjunto si hay) y uno de confirmación al cliente. Los esperamos (con
  // Promise.allSettled, no Promise.all) porque en serverless una promesa
  // "fire and forget" puede cortarse antes de terminar si la función ya
  // respondió — así nos aseguramos de que termine de mandarse (o de
  // loguearse el fallo) antes de devolver la respuesta. Si alguno falla no
  // rompe la creación del ticket.
  const [notifAdmin, notifCliente] = await Promise.allSettled([
    notificarNuevoTicketAAdmins(ticket, `${session.clienteNombre} — levantado por ${session.nombre}`, adjunto),
    confirmarTicketAlCliente(ticket, session.email),
  ]);
  if (notifAdmin.status === 'rejected') {
    console.error('[email] Error notificando a admins:', notifAdmin.reason?.message);
  }
  if (notifCliente.status === 'rejected') {
    console.error('[email] Error confirmando al cliente:', notifCliente.reason?.message);
  }

  return NextResponse.json({ ticket }, { status: 201 });
}
