import { NextResponse } from 'next/server';
import { query } from '@/db/client';
import { getAgenteSessionFromRequest } from '@/lib/auth';

const MODULOS = ['App móvil (Preventa)', 'Televentas', 'B2B eCommerce', 'Inventarios', 'Facturación', 'Reportería / KPIs'];
const ROLES = ['Todos los perfiles', 'Administrador', 'Vendedor / Preventista', 'Cobrador', 'Entregador'];

export async function GET(req) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { rows } = await query(
    `SELECT id, titulo, descripcion, modulo, rol, archivo_url, created_at
     FROM manuales ORDER BY modulo, titulo`
  );
  return NextResponse.json({ manuales: rows });
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

  const titulo = (body.titulo || '').trim();
  const descripcion = (body.descripcion || '').trim();
  const modulo = body.modulo || '';
  const rol = body.rol || 'Todos los perfiles';
  const archivoUrl = (body.archivoUrl || '').trim();

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
    `INSERT INTO manuales (titulo, descripcion, modulo, rol, archivo_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, titulo, descripcion, modulo, rol, archivo_url, created_at`,
    [titulo, descripcion || null, modulo, rol, archivoUrl]
  );

  return NextResponse.json({ manual: rows[0] }, { status: 201 });
}
