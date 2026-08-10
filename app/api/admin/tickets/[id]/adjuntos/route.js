import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';

export async function GET(req, { params }) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Id inválido' }, { status: 400 });
  }

  const { rows } = await query(
    `SELECT a.id, a.nombre, a.url, a.created_at, ag.nombre AS agente_nombre
     FROM tickets_adjuntos a
     LEFT JOIN agentes ag ON ag.id = a.agente_id
     WHERE a.ticket_id = $1
     ORDER BY a.created_at DESC`,
    [id]
  );

  return NextResponse.json({ adjuntos: rows });
}

export async function POST(req, { params }) {
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

  const nombre = (body.nombre || '').trim();
  const url = (body.url || '').trim();

  if (!nombre || !url) {
    return NextResponse.json({ error: 'Nombre y URL son obligatorios' }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'La URL tiene que empezar con http:// o https://' }, { status: 400 });
  }

  const { rows: ticketRows } = await query('SELECT id FROM tickets WHERE id = $1', [id]);
  if (!ticketRows[0]) {
    return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
  }

  const { rows } = await query(
    `INSERT INTO tickets_adjuntos (ticket_id, nombre, url, agente_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nombre, url, created_at`,
    [id, nombre, url, session.agenteId]
  );

  return NextResponse.json({ adjunto: rows[0] }, { status: 201 });
}
