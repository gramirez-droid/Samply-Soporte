import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/db/client';
import { signSession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña son obligatorios' }, { status: 400 });
  }

  // El login ahora es por USUARIO individual, no por empresa — una empresa
  // puede tener varios usuarios levantando tickets.
  const { rows } = await query(
    `SELECT u.id AS usuario_id, u.nombre AS usuario_nombre, u.email, u.password_hash, u.activo AS usuario_activo,
            c.id AS cliente_id, c.nombre AS cliente_nombre, c.activo AS cliente_activo
     FROM usuarios_cliente u
     JOIN clientes c ON c.id = u.cliente_id
     WHERE u.email = $1`,
    [email]
  );
  const usuario = rows[0];

  if (!usuario) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, usuario.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  // Chequeo de "activo" recién después de validar la contraseña — así no le
  // filtramos a alguien sin la clave correcta si la cuenta existe/está activa.
  // Dos niveles: el usuario individual, y la empresa completa (si se
  // desactiva la empresa, ningún usuario de ahí puede entrar, sin importar
  // su propio estado).
  if (!usuario.cliente_activo) {
    return NextResponse.json({ error: 'Esta cuenta está desactivada. Contactate con Samply.' }, { status: 403 });
  }
  if (!usuario.usuario_activo) {
    return NextResponse.json({ error: 'Tu usuario está desactivado. Contactate con Samply.' }, { status: 403 });
  }

  const token = await signSession({
    clienteId: usuario.cliente_id,
    clienteNombre: usuario.cliente_nombre,
    usuarioId: usuario.usuario_id,
    nombre: usuario.usuario_nombre,
    email: usuario.email,
  });

  const res = NextResponse.json({
    id: usuario.usuario_id,
    nombre: usuario.usuario_nombre,
    email: usuario.email,
    clienteNombre: usuario.cliente_nombre,
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 días, igual que la expiración del JWT
  });
  return res;
}
