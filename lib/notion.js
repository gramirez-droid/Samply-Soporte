// Integración con Notion vía fetch directo (sin @notionhq/client, para no
// sumar una dependencia pesada por algo que son pocos endpoints REST).
//
// Flujo confirmado por Gonzalo:
//   - Ticket pasa a "En progreso" en Samply → se crea la page en la base
//     "User Stories" existente, con:
//       · Status producto = "Tickets Soporte" (opción que Gonzalo agrega a mano)
//       · Status Sprint Activo = "To do"
//       · Assignee = la(s) persona(s) real(es) de Notion que coincidan por
//         nombre con los agentes asignados en Samply (si hay coincidencia)
//     El resto de la info (cliente, categoría, prioridad, módulo, resumen IA,
//     link al ticket) va como texto en el CUERPO de la page, no como
//     properties nuevas — así no hay que tocar el schema de esa base.
//   - Cuando en Notion mueven la tarjeta a Status Sprint Activo = "Done" →
//     el ticket pasa a "Resuelto" en Samply y se dispara el email de
//     resolución (ver sincronizarResueltosDesdeNotion en lib/tickets.js).
//   - El botón "Sincronizar con Notion" hace las dos cosas cada vez que se
//     aprieta: empuja el Assignee actualizado hacia Notion, y trae de
//     vuelta los "Done" para marcarlos Resuelto acá.
//
// Sin NOTION_API_KEY / NOTION_DATABASE_ID configuradas, todas las funciones
// de este archivo son no-op (no rompen nada, solo loguean que no están
// configuradas) — así el resto del flujo sigue funcionando sin Notion.

const NOTION_VERSION = '2022-06-28';

// Confirmado mirando la vista de tabla de "User Stories" — la propiedad de
// título se llama "User Story name" (no "Name", el default de Notion).
const PROP_TITLE = 'User Story name';
// Gonzalo creó la opción "Tickets Soporte" en "Status negocio" (no en
// "Status producto" como se había pensado en un principio) — el código
// apunta a donde realmente está.
const PROP_STATUS_PRODUCTO = 'Status negocio';
// Confirmado por Gonzalo directo del encabezado de la columna: se llama
// "Status Sprint Actual" (no "Activo" — el nombre venía cortado en la UI
// como "Status Sprint Ac..." y adivinamos mal la primera vez).
const PROP_STATUS_SPRINT = 'Status Sprint Actual';
const PROP_ASSIGNEE = 'Assignee';

const VALOR_STATUS_PRODUCTO_INICIAL = 'Tickets Soporte';
const VALOR_STATUS_SPRINT_INICIAL = 'To do';
const VALOR_STATUS_SPRINT_DONE = 'Done';

export function notionConfigurado() {
  return Boolean(process.env.NOTION_API_KEY && process.env.NOTION_DATABASE_ID);
}

function notionHeaders() {
  return {
    Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

// ---------------------------------------------------------------------------
// Buscar personas reales de Notion por nombre, para el Assignee. Se cachea
// en memoria del proceso (no persiste entre invocaciones frías de la
// función serverless, pero evita golpear la API de más dentro de la misma
// request/instancia tibia).
// ---------------------------------------------------------------------------

let cacheUsuariosNotion = null;

function normalizar(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // saca acentos
    .trim();
}

async function listarUsuariosNotion() {
  if (cacheUsuariosNotion) return cacheUsuariosNotion;

  const res = await fetch('https://api.notion.com/v1/users', { headers: notionHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion respondió ${res.status} listando usuarios: ${text}`);
  }
  const data = await res.json();
  cacheUsuariosNotion = data.results.filter((u) => u.type === 'person');
  return cacheUsuariosNotion;
}

/** Busca la persona de Notion cuyo nombre coincide (sin acentos/mayúsculas)
 *  con el nombre dado. Devuelve el id de Notion, o null si no encuentra. */
export async function buscarUsuarioNotionPorNombre(nombre) {
  if (!notionConfigurado() || !nombre) return null;
  try {
    const usuarios = await listarUsuariosNotion();
    const objetivo = normalizar(nombre);
    const encontrado = usuarios.find((u) => normalizar(u.name) === objetivo);
    if (!encontrado) {
      console.log(`[notion] No se encontró en Notion a "${nombre}" para asignar — queda sin Assignee.`);
      return null;
    }
    return encontrado.id;
  } catch (err) {
    console.log('[notion] Error buscando usuario por nombre:', err.message);
    return null;
  }
}

async function idsAssigneePorNombres(nombres) {
  const ids = [];
  for (const nombre of nombres) {
    const id = await buscarUsuarioNotionPorNombre(nombre);
    if (id) ids.push(id);
  }
  return ids;
}

/**
 * Crea la page del ticket en la Notion database de soporte.
 * `agentesNombres` es la lista de nombres de agentes ya asignados en Samply
 * en el momento de crear el ticket en Notion (puede venir vacía).
 * Devuelve el notion_page_id, o null si Notion no está configurado.
 */
export async function crearTicketEnNotion(ticket, clienteNombre, agentesNombres = []) {
  if (!notionConfigurado()) {
    console.log('[notion] NOTION_API_KEY / NOTION_DATABASE_ID no configurados — no se crea la page.');
    return null;
  }

  const urlTicket = `${process.env.APP_URL || 'http://localhost:3000'}/admin/soporte?ticket=${ticket.id}`;
  const assigneeIds = await idsAssigneePorNombres(agentesNombres);

  const properties = {
    [PROP_TITLE]: { title: [{ text: { content: `${ticket.codigo} — ${ticket.asunto}` } }] },
    [PROP_STATUS_PRODUCTO]: { status: { name: VALOR_STATUS_PRODUCTO_INICIAL } },
    [PROP_STATUS_SPRINT]: { status: { name: VALOR_STATUS_SPRINT_INICIAL } },
  };
  if (assigneeIds.length > 0) {
    properties[PROP_ASSIGNEE] = { people: assigneeIds.map((id) => ({ id })) };
  }

  const body = {
    parent: { database_id: process.env.NOTION_DATABASE_ID },
    properties,
    children: [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ text: { content: `Cliente: ${clienteNombre}` } }] },
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            text: { content: `Categoría: ${ticket.categoria} · Módulo: ${ticket.modulo} · Prioridad: ${ticket.prioridad}` },
          }],
        },
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ text: { content: `Resumen: ${ticket.ai_resumen || '—'}` } }] },
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: 'Ver ticket en Samply', link: { url: urlTicket } } }],
        },
      },
    ],
  };

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion respondió ${res.status} creando la page: ${text}`);
  }

  const data = await res.json();
  return data.id;
}

/** Actualiza SOLO el Assignee de una page ya creada — se llama cada vez que
 *  se aprieta "Sincronizar con Notion", para reflejar cambios de agente
 *  asignado que pasaron después de crear la page. No toca nada más. */
export async function actualizarAssigneeEnNotion(notionPageId, agentesNombres) {
  if (!notionConfigurado() || !notionPageId) return;

  const assigneeIds = await idsAssigneePorNombres(agentesNombres);
  const res = await fetch(`https://api.notion.com/v1/pages/${notionPageId}`, {
    method: 'PATCH',
    headers: notionHeaders(),
    body: JSON.stringify({
      properties: {
        [PROP_ASSIGNEE]: { people: assigneeIds.map((id) => ({ id })) },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion respondió ${res.status} actualizando Assignee: ${text}`);
  }
}

/**
 * Busca en Notion las pages marcadas Status Sprint Activo = "Done" — son
 * las que tienen que reflejarse como "Resuelto" del lado nuestro.
 * Devuelve [] si Notion no está configurado.
 */
export async function buscarTicketsValidadosEnNotion() {
  if (!notionConfigurado()) return [];

  const res = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`, {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      filter: { property: PROP_STATUS_SPRINT, status: { equals: VALOR_STATUS_SPRINT_DONE } },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion respondió ${res.status} consultando la database: ${text}`);
  }

  const data = await res.json();
  return data.results; // cada resultado tiene `.id` = notion_page_id
}
