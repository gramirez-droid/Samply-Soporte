import { SignJWT, jwtVerify } from 'jose';

// Dos sesiones separadas y sin relación entre sí: la del cliente
// (distribuidora) y la del agente (staff Samply). Cookies distintas para
// que un mismo browser pueda, en teoría, tener ambas a la vez sin pisarse
// (aunque en la práctica van a ser dos personas distintas).
export const SESSION_COOKIE = 'samply_session';
export const AGENTE_SESSION_COOKIE = 'samply_agente_session';
const SESSION_TTL = '7d';

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('Falta AUTH_SECRET en las variables de entorno (generar con: openssl rand -base64 32).');
  }
  return new TextEncoder().encode(secret);
}

async function sign(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getSecretKey());
}

async function verify(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch {
    return null;
  }
}

/** Firma un JWT de sesión de cliente con { clienteId, nombre, email }. */
export async function signSession(payload) {
  return sign({ ...payload, kind: 'cliente' });
}

/** Firma un JWT de sesión de agente con { agenteId, nombre, email }. */
export async function signAgenteSession(payload) {
  return sign({ ...payload, kind: 'agente' });
}

/** Verifica un JWT y devuelve el payload, o null si es inválido/expiró. */
export async function verifySession(token) {
  return verify(token);
}

/** Lee y verifica la sesión de CLIENTE desde la cookie de un NextRequest. */
export async function getSessionFromRequest(req) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verify(token);
}

/** Lee y verifica la sesión de AGENTE desde la cookie de un NextRequest. */
export async function getAgenteSessionFromRequest(req) {
  const token = req.cookies.get(AGENTE_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verify(token);
}
