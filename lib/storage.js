// Storage de archivos reales con Netlify Blobs — no hace falta ninguna
// cuenta nueva ni API key: como el sitio ya corre en Netlify, el storage
// viene incluido y se autentica solo (vía el contexto de la función
// serverless). Funciona igual para manuales del Centro de Ayuda y para
// adjuntos de tickets — mismo helper para los dos.

import { getStore } from '@netlify/blobs';
import { randomUUID } from 'crypto';

const TIPOS_PERMITIDOS = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
};

// Límite conservador: las funciones serverless de Netlify tienen un tope
// de tamaño de request — nos quedamos abajo de eso con margen.
const TAMANO_MAXIMO_BYTES = 4.5 * 1024 * 1024; // 4.5 MB

function sanitizarNombre(nombre) {
  return (nombre || 'archivo')
    .toLowerCase()
    .replace(/[^a-z0-9.\-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

/**
 * Sube un archivo (File de un FormData) al storage. `carpeta` es solo para
 * organizar las keys (ej: "manuales" o "tickets/42"). Devuelve
 * { url, nombreOriginal } — la url es la que se guarda en la DB, y sirve
 * el archivo real vía /api/files?key=... (query param, no path — Netlify
 * trata las URLs que terminan en .pdf/.jpg como archivo estático y devuelve
 * 404 sin ejecutar la función si la extensión queda al final del path).
 * Tira un Error con mensaje en español si el archivo no pasa las validaciones.
 */
export async function subirArchivo(file, carpeta) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new Error('No se recibió ningún archivo');
  }
  if (!TIPOS_PERMITIDOS[file.type]) {
    throw new Error('Solo se aceptan PDF, JPG o PNG');
  }
  if (file.size > TAMANO_MAXIMO_BYTES) {
    throw new Error(`El archivo pesa demasiado (máximo ${(TAMANO_MAXIMO_BYTES / 1024 / 1024).toFixed(1)} MB)`);
  }

  const extension = TIPOS_PERMITIDOS[file.type];
  const key = `${carpeta}/${randomUUID()}-${sanitizarNombre(file.name)}`;

  const store = getStore('samply-uploads');
  const buffer = await file.arrayBuffer();
  await store.set(key, buffer, {
    metadata: { contentType: file.type, nombreOriginal: file.name },
  });

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  return {
    url: `${appUrl}/api/files?key=${encodeURIComponent(key)}`,
    nombreOriginal: file.name,
  };
}

/** Trae un archivo ya subido — usado por la ruta pública que lo sirve. */
export async function obtenerArchivo(key) {
  const store = getStore('samply-uploads');
  const resultado = await store.getWithMetadata(key, { type: 'arrayBuffer' });
  if (!resultado) return null;
  return { data: resultado.data, contentType: resultado.metadata?.contentType || 'application/octet-stream' };
}
