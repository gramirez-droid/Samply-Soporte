import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';

export async function GET(req, { params }) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const clienteId = Number(params.id);
  if (!Number.isInteger(clienteId)) {
    return NextResponse.json({ error: 'Id inválido' }, { status: 400 });
  }

  const { rows } = await query(
    `SELECT id, nombre, email, activo, created_at
     FROM usuarios_cliente
     WHERE cliente_id = $1
     ORDER BY nombre`,
    [clienteId]
  );
  return NextResponse.json({ usuarios: rows });
}

export async function POST(req, { params }) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const clienteId = Number(params.id);
  if (!Number.isInteger(clienteId)) {
    return NextResponse.json({ error: 'Id inválido' }, { status: 400 });
  }

  const { rows: clienteRows } = await query('SELECT id FROM clientes WHERE id = $1', [clienteId]);
  if (!clienteRows[0]) {
    return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
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

  // El email es único en TODO el sistema (una persona = una cuenta), no
  // solo dentro de la empresa.
  const { rows: existentes } = await query('SELECT id FROM usuarios_cliente WHERE email = $1', [email]);
  if (existentes[0]) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO usuarios_cliente (cliente_id, nombre, email, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nombre, email, activo, created_at`,
    [clienteId, nombre, email, hash]
  );

  return NextResponse.json({ usuario: rows[0] }, { status: 201 });
}
