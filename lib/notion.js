// Integración con Notion vía fetch directo (sin @notionhq/client, para no
// sumar una dependencia pesada por algo que son 2 endpoints REST simples).
//
// Flujo (confirmado por Gonzalo):
//   - Ticket pasa a "En progreso" en nuestro panel → se crea la page en Notion.
//   - Cuando en Notion el staff marca "Validación Customer" → el ticket
//     pasa a "Resuelto" acá (ver sincronizarResueltosDesdeNotion en lib/tickets.js).
//
// Sin NOTION_API_KEY / NOTION_DATABASE_ID configuradas, todas las funciones
// de este archivo son no-op (no rompen nada, solo loguean que no están
// configuradas) — así el resto del flujo sigue funcionando sin Notion.

const NOTION_VERSION = '2022-06-28';

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

/**
 * Crea la page del ticket en la Notion database de soporte.
 * Devuelve el notion_page_id, o null si Notion no está configurado.
 *
 * IMPORTANTE: los nombres de las properties ('Asunto', 'Categoría', etc.)
 * tienen que coincidir EXACTO con los de tu Notion database (mayúsculas y
 * acentos incluidos). Si tu database usa otros nombres, es lo único que
 * hay que ajustar en esta función.
 */
export async function crearTicketEnNotion(ticket, clienteNombre) {
  if (!notionConfigurado()) {
    console.log('[notion] NOTION_API_KEY / NOTION_DATABASE_ID no configurados — no se crea la page.');
    return null;
  }

  const urlTicket = `${process.env.APP_URL || 'http://localhost:3000'}/admin/soporte?ticket=${ticket.id}`;

  const body = {
    parent: { database_id: process.env.NOTION_DATABASE_ID },
    properties: {
      Asunto: { title: [{ text: { content: ticket.asunto } }] },
      Categoría: { select: { name: ticket.categoria } },
      Prioridad: { select: { name: ticket.prioridad } },
      Estado: { select: { name: 'En progreso' } },
      Cliente: { rich_text: [{ text: { content: clienteNombre } }] },
      'Resumen IA': { rich_text: [{ text: { content: ticket.ai_resumen || '' } }] },
      'Link al ticket': { url: urlTicket },
    },
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

/**
 * Busca en Notion las pages marcadas como "Validación Customer" — son las
 * que tienen que reflejarse como "Resuelto" del lado nuestro.
 * Devuelve [] si Notion no está configurado.
 */
export async function buscarTicketsValidadosEnNotion() {
  if (!notionConfigurado()) return [];

  const res = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`, {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      filter: { property: 'Estado', select: { equals: 'Validación Customer' } },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion respondió ${res.status} consultando la database: ${text}`);
  }

  const data = await res.json();
  return data.results; // cada resultado tiene `.id` = notion_page_id
}
