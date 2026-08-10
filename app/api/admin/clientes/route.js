import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';

export async function GET(req) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { rows } = await query(
    `SELECT c.id, c.nombre, c.activo, c.created_at,
            COUNT(DISTINCT t.id) AS tickets_count,
            COUNT(DISTINCT uc.id) AS usuarios_count
     FROM clientes c
     LEFT JOIN tickets t ON t.cliente_id = c.id
     LEFT JOIN usuarios_cliente uc ON uc.cliente_id = c.id
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
  if (!nombre) {
    return NextResponse.json({ error: 'El nombre de la empresa es obligatorio' }, { status: 400 });
  }

  // Crear el cliente ya NO pide email/contraseña — eso ahora vive en
  // usuarios_cliente, porque una empresa puede tener varios usuarios.
  // Después de crear la empresa, se le suman usuarios desde su modal.
  const { rows } = await query(
    `INSERT INTO clientes (nombre) VALUES ($1)
     RETURNING id, nombre, activo, created_at`,
    [nombre]
  );

  return NextResponse.json({ cliente: { ...rows[0], tickets_count: 0, usuarios_count: 0 } }, { status: 201 });
}
