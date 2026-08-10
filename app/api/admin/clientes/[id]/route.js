import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';

export async function PATCH(req, { params }) {
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

  if (body.activo === undefined && body.nombre === undefined) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
  }

  const { rows: actualRows } = await query('SELECT * FROM clientes WHERE id = $1', [id]);
  const actual = actualRows[0];
  if (!actual) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  const nombre = body.nombre !== undefined ? body.nombre.trim() : actual.nombre;
  const activo = body.activo !== undefined ? Boolean(body.activo) : actual.activo;

  if (!nombre) {
    return NextResponse.json({ error: 'El nombre no puede quedar vacío' }, { status: 400 });
  }

  // Desactivar la EMPRESA bloquea a todos sus usuarios de una — no hace
  // falta desactivarlos uno por uno (el login chequea ambos niveles).
  const { rows } = await query(
    `UPDATE clientes SET nombre = $1, activo = $2
     WHERE id = $3
     RETURNING id, nombre, activo, created_at`,
    [nombre, activo, id]
  );

  return NextResponse.json({ cliente: rows[0] });
}
