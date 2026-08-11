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

  const { rows: actualRows } = await query('SELECT * FROM agentes WHERE id = $1', [id]);
  const actual = actualRows[0];
  if (!actual) {
    return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
  }

  const nombre = body.nombre !== undefined ? body.nombre.trim() : actual.nombre;
  const activo = body.activo !== undefined ? Boolean(body.activo) : actual.activo;

  if (!nombre) {
    return NextResponse.json({ error: 'El nombre no puede quedar vacío' }, { status: 400 });
  }

  const { rows } = await query(
    `UPDATE agentes SET nombre = $1, activo = $2
     WHERE id = $3
     RETURNING id, nombre, email, activo, created_at`,
    [nombre, activo, id]
  );

  return NextResponse.json({ agente: rows[0] });
}

export async function DELETE(req, { params }) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Id inválido' }, { status: 400 });
  }

  // No te dejamos borrarte a vos mismo mientras estás logueado — te
  // quedarías sin sesión válida a mitad de la operación.
  if (session.agenteId === id) {
    return NextResponse.json({ error: 'No podés eliminar tu propio usuario mientras estás logueado con él' }, { status: 400 });
  }

  // El borrado es real (no soft-delete). Los tickets que este agente tenía
  // asignados simplemente lo pierden de la lista de asignados (quedan con
  // los demás agentes, si había más de uno) — y los mensajes/adjuntos que
  // dejó no se borran, solo pierden la referencia (se muestran sin nombre).
  const { rows } = await query('DELETE FROM agentes WHERE id = $1 RETURNING id', [id]);
  if (!rows[0]) {
    return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
