import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';

export async function GET(req) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { rows } = await query(
    `SELECT c.id, c.nombre, c.email, c.created_at,
            COUNT(t.id) AS tickets_count
     FROM clientes c
     LEFT JOIN tickets t ON t.cliente_id = c.id
     GROUP BY c.id
     ORDER BY c.nombre`
  );
  return NextResponse.json({ clientes: rows });
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

  const { rows: existentes } = await query('SELECT id FROM clientes WHERE email = $1', [email]);
  if (existentes[0]) {
    return NextResponse.json({ error: 'Ya existe un cliente con ese email' }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO clientes (nombre, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, nombre, email, created_at`,
    [nombre, email, hash]
  );

  return NextResponse.json({ cliente: rows[0] }, { status: 201 });
}
