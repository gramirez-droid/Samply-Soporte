import { NextResponse } from 'next/server';
import { AGENTE_SESSION_COOKIE } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AGENTE_SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
