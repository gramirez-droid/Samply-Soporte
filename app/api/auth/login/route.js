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

  const { rows } = await query(
    'SELECT id, nombre, email, password_hash FROM clientes WHERE email = $1',
    [email]
  );
  const cliente = rows[0];

  if (!cliente) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, cliente.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const token = await signSession({
    clienteId: cliente.id,
    nombre: cliente.nombre,
    email: cliente.email,
  });

  const res = NextResponse.json({ id: cliente.id, nombre: cliente.nombre, email: cliente.email });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 días, igual que la expiración del JWT
  });
  return res;
}
