import { NextResponse } from 'next/server';
import { getAgenteSessionFromRequest } from '@/lib/auth';
import { sincronizarResueltosDesdeNotion, sincronizarAssigneesHaciaNotion } from '@/lib/tickets';
import { notionConfigurado } from '@/lib/notion';

export async function POST(req) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  if (!notionConfigurado()) {
    return NextResponse.json(
      { error: 'Notion no está configurado todavía (faltan NOTION_API_KEY / NOTION_DATABASE_ID)' },
      { status: 400 }
    );
  }

  try {
    // Dos direcciones en un solo click: primero empuja los agentes
    // asignados hacia Notion (Samply → Notion), después trae los que ya
    // están en "Done" y los marca Resuelto acá (Notion → Samply).
    const assigneesActualizados = await sincronizarAssigneesHaciaNotion();
    const actualizados = await sincronizarResueltosDesdeNotion();
    return NextResponse.json({ actualizados, assigneesActualizados });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
