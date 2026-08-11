import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';

export async function GET(req) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Sin filtro de ?todos=1: solo activos (para dropdowns de asignación).
  // Con ?todos=1: todos, para la pantalla de gestión de agentes.
  const url = new URL(req.url);
  const soloActivos = url.searchParams.get('todos') !== '1';

  const { rows } = await query(
    soloActivos
      ? `SELECT id, nombre, email FROM agentes WHERE activo = true ORDER BY nombre`
      : `SELECT a.id, a.nombre, a.email, a.activo, a.created_at,
                COUNT(DISTINCT ta.ticket_id) AS tickets_count
         FROM agentes a
         LEFT JOIN tickets_agentes ta ON ta.agente_id = a.id
         GROUP BY a.id
         ORDER BY a.nombre`
  );
  return NextResponse.json({ agentes: rows });
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

  const nombre = (body.nombre || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!nombre || !email || !password) {
    return NextResponse.json({ error: 'Nombre, email y contraseña son obligatorios' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'La contraseña tiene que tener al menos 6 caracteres' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  const { rows: existentes } = await query('SELECT id FROM agentes WHERE email = $1', [email]);
  if (existentes[0]) {
    return NextResponse.json({ error: 'Ya existe un agente con ese email' }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO agentes (nombre, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, nombre, email, activo, created_at`,
    [nombre, email, hash]
  );

  return NextResponse.json({ agente: { ...rows[0], tickets_count: 0 } }, { status: 201 });
}
