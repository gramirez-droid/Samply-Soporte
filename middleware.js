import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// jose funciona en Edge Runtime, por eso el middleware verifica el JWT
// directamente en vez de importar lib/auth.js (que asume Node runtime).
const SESSION_COOKIE = 'samply_session';
const AGENTE_SESSION_COOKIE = 'samply_agente_session';

const PROTECTED_CLIENTE_PAGES = ['/soporte'];
const PROTECTED_CLIENTE_API = ['/api/tickets', '/api/manuales'];

const PROTECTED_AGENTE_PAGES = ['/admin/soporte'];
const PROTECTED_AGENTE_API = ['/api/admin'];
const PUBLIC_AGENTE_API = ['/api/admin/auth']; // login/logout, sin sesión previa

async function verify(token) {
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  const isClientePage = PROTECTED_CLIENTE_PAGES.some((p) => pathname.startsWith(p));
  const isClienteApi = PROTECTED_CLIENTE_API.some((p) => pathname.startsWith(p));
  const isAgentePage = PROTECTED_AGENTE_PAGES.some((p) => pathname.startsWith(p));
  const isAgenteApi =
    PROTECTED_AGENTE_API.some((p) => pathname.startsWith(p)) &&
    !PUBLIC_AGENTE_API.some((p) => pathname.startsWith(p));

  if (!isClientePage && !isClienteApi && !isAgentePage && !isAgenteApi) {
    return NextResponse.next();
  }

  // --- Rutas de cliente (distribuidora) ---
  if (isClientePage || isClienteApi) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verify(token) : null;

    if (!session) {
      if (isClienteApi) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const headers = new Headers(req.headers);
    headers.set('x-cliente-id', String(session.clienteId));
    headers.set('x-cliente-nombre', session.nombre || '');
    return NextResponse.next({ request: { headers } });
  }

  // --- Rutas de agente (staff Samply) ---
  const token = req.cookies.get(AGENTE_SESSION_COOKIE)?.value;
  const session = token ? await verify(token) : null;

  if (!session) {
    if (isAgenteApi) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    const loginUrl = new URL('/admin/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const headers = new Headers(req.headers);
  headers.set('x-agente-id', String(session.agenteId));
  headers.set('x-agente-nombre', session.nombre || '');
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    '/soporte/:path*',
    '/api/tickets/:path*',
    '/api/manuales/:path*',
    '/admin/soporte/:path*',
    '/api/admin/:path*',
  ],
};
