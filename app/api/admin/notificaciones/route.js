import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';

export async function GET(req) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { rows } = await query('SELECT id, email, created_at FROM notificacion_emails ORDER BY email');
  return NextResponse.json({ emails: rows });
}

export async function POST(req) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'El email es obligatorio' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  const { rows: existentes } = await query('SELECT id FROM notificacion_emails WHERE email = $1', [email]);
  if (existentes[0]) {
    return NextResponse.json({ error: 'Ese email ya está en la lista' }, { status: 409 });
  }

  const { rows } = await query(
    'INSERT INTO notificacion_emails (email) VALUES ($1) RETURNING id, email, created_at',
    [email]
  );

  return NextResponse.json({ email: rows[0] }, { status: 201 });
}
