import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';

const MODULOS = ['App móvil (Preventa)', 'Televentas', 'B2B eCommerce', 'Inventarios', 'Facturación', 'Reportería / KPIs'];
const ROLES = ['Todos los perfiles', 'Administrador', 'Vendedor / Preventista', 'Cobrador', 'Entregador'];

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

  const { rows: actualRows } = await query('SELECT * FROM manuales WHERE id = $1', [id]);
  const actual = actualRows[0];
  if (!actual) {
    return NextResponse.json({ error: 'Manual no encontrado' }, { status: 404 });
  }

  const titulo = body.titulo !== undefined ? body.titulo.trim() : actual.titulo;
  const descripcion = body.descripcion !== undefined ? (body.descripcion.trim() || null) : actual.descripcion;
  const modulo = body.modulo !== undefined ? body.modulo : actual.modulo;
  const rol = body.rol !== undefined ? body.rol : actual.rol;
  const archivoUrl = body.archivoUrl !== undefined ? body.archivoUrl.trim() : actual.archivo_url;

  if (!titulo || !archivoUrl) {
    return NextResponse.json({ error: 'Título y URL del PDF son obligatorios' }, { status: 400 });
  }
  if (!MODULOS.includes(modulo)) {
    return NextResponse.json({ error: 'Módulo inválido' }, { status: 400 });
  }
  if (!ROLES.includes(rol)) {
    return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 });
  }
  if (!/^https?:\/\/|^\//i.test(archivoUrl)) {
    return NextResponse.json({ error: 'La URL tiene que empezar con http://, https:// o /' }, { status: 400 });
  }

  const { rows } = await query(
    `UPDATE manuales SET titulo = $1, descripcion = $2, modulo = $3, rol = $4, archivo_url = $5
     WHERE id = $6
     RETURNING id, titulo, descripcion, modulo, rol, archivo_url, created_at`,
    [titulo, descripcion, modulo, rol, archivoUrl, id]
  );

  return NextResponse.json({ manual: rows[0] });
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

  const { rows } = await query('DELETE FROM manuales WHERE id = $1 RETURNING id', [id]);
  if (!rows[0]) {
    return NextResponse.json({ error: 'Manual no encontrado' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
