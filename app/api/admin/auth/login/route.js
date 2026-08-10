import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/db/client';
import { signAgenteSession, AGENTE_SESSION_COOKIE } from '@/lib/auth';

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
    'SELECT id, nombre, email, password_hash, activo FROM agentes WHERE email = $1',
    [email]
  );
  const agente = rows[0];

  if (!agente || !agente.activo) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, agente.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  const token = await signAgenteSession({
    agenteId: agente.id,
    nombre: agente.nombre,
    email: agente.email,
  });

  const res = NextResponse.json({ id: agente.id, nombre: agente.nombre, email: agente.email });
  res.cookies.set(AGENTE_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
