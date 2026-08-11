import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';

export async function PATCH(req, { params }) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const clienteId = Number(params.id);
  const usuarioId = Number(params.usuarioId);
  if (!Number.isInteger(clienteId) || !Number.isInteger(usuarioId)) {
    return NextResponse.json({ error: 'Id inválido' }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  if (body.activo === undefined && body.nombre === undefined) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
  }

  const { rows: actualRows } = await query(
    'SELECT * FROM usuarios_cliente WHERE id = $1 AND cliente_id = $2',
    [usuarioId, clienteId]
  );
  const actual = actualRows[0];
  if (!actual) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const nombre = body.nombre !== undefined ? body.nombre.trim() : actual.nombre;
  const activo = body.activo !== undefined ? Boolean(body.activo) : actual.activo;

  if (!nombre) {
    return NextResponse.json({ error: 'El nombre no puede quedar vacío' }, { status: 400 });
  }

  const { rows } = await query(
    `UPDATE usuarios_cliente SET nombre = $1, activo = $2
     WHERE id = $3
     RETURNING id, nombre, email, activo, created_at`,
    [nombre, activo, usuarioId]
  );

  return NextResponse.json({ usuario: rows[0] });
}

export async function DELETE(req, { params }) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const clienteId = Number(params.id);
  const usuarioId = Number(params.usuarioId);
  if (!Number.isInteger(clienteId) || !Number.isInteger(usuarioId)) {
    return NextResponse.json({ error: 'Id inválido' }, { status: 400 });
  }

  // Borra al USUARIO puntual, no a la empresa — los tickets que había
  // levantado quedan en la empresa (solo pierden el dato de "quién
  // exactamente" los levantó, por la referencia SET NULL en el schema).
  const { rows } = await query(
    'DELETE FROM usuarios_cliente WHERE id = $1 AND cliente_id = $2 RETURNING id',
    [usuarioId, clienteId]
  );
  if (!rows[0]) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
