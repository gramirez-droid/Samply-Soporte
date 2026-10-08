import { NextResponse } from 'next/server';
import { obtenerArchivo } from '@/lib/storage';

// Sirve los archivos subidos (adjuntos, manuales, audios) desde Netlify Blobs.
//
// La key va como query param (?key=...) y no en el path: Netlify trataba las
// URLs terminadas en .pdf/.jpg como archivo estático y devolvía 404 sin
// ejecutar la función.
//
// Pública a propósito: la key incluye un UUID random, no adivinable — mismo
// nivel de "seguridad por oscuridad" que un link de Google Drive.

const HEADERS_CACHE = {
  // OJO: antes era 'public, max-age=31536000, immutable'. Netlify NO incluye
  // los query params en la clave de caché del CDN por defecto, así que
  // /api/files?key=A y /api/files?key=B eran "la misma URL" para el CDN y se
  // servía siempre el primer archivo cacheado.
  // - private: el CDN no lo cachea (solo el navegador, que sí distingue la
  //   URL completa).
  // - Netlify-Vary: query → si algún día se cachea en el CDN, cada ?key=
  //   tiene su propia entrada.
  'Cache-Control': 'private, max-age=86400',
  'Netlify-CDN-Cache-Control': 'no-store',
  'Netlify-Vary': 'query',
  // Los reproductores de audio (sobre todo Safari / iPhone) piden el archivo
  // por pedazos y no reproducen si el servidor no lo soporta.
  'Accept-Ranges': 'bytes',
};

export async function GET(req) {
  const key = req.nextUrl.searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'Falta el parámetro key' }, { status: 400 });
  }

  try {
    const archivo = await obtenerArchivo(key);
    if (!archivo) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
    }

    const bytes = new Uint8Array(archivo.data);
    const total = bytes.byteLength;
    const base = { ...HEADERS_CACHE, 'Content-Type': archivo.contentType };

    // Range: bytes=inicio-fin  (fin opcional)  |  bytes=-N (últimos N bytes)
    const range = req.headers.get('range');
    const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m && (m[1] !== '' || m[2] !== '')) {
      let inicio, fin;
      if (m[1] === '') {
        inicio = Math.max(total - Number(m[2]), 0);
        fin = total - 1;
      } else {
        inicio = Number(m[1]);
        fin = m[2] === '' ? total - 1 : Math.min(Number(m[2]), total - 1);
      }
      if (inicio >= total || inicio > fin) {
        return new NextResponse(null, { status: 416, headers: { ...base, 'Content-Range': `bytes */${total}` } });
      }
      return new NextResponse(bytes.slice(inicio, fin + 1), {
        status: 206,
        headers: { ...base, 'Content-Range': `bytes ${inicio}-${fin}/${total}`, 'Content-Length': String(fin - inicio + 1) },
      });
    }

    return new NextResponse(bytes, { headers: { ...base, 'Content-Length': String(total) } });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
