import { NextResponse } from 'next/server';
import { obtenerArchivo } from '@/lib/storage';

// Antes esto era /api/files/[...key] (la key en el path). Netlify, al ver
// una URL que termina en ".pdf"/".jpg", la trataba como si fuera un
// archivo estático y devolvía 404 sin siquiera ejecutar esta función —
// por eso ahora la key va como query param: la extensión queda adentro
// del ?key=..., no al final del path, y así no se confunde.
//
// Pública a propósito: la key incluye un UUID random, no hay nada
// adivinable — mismo nivel de "seguridad por oscuridad" que un link de
// Google Drive.
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
    return new NextResponse(archivo.data, {
      headers: {
        'Content-Type': archivo.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
