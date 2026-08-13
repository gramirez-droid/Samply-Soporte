import { NextResponse } from 'next/server';
import { getAgenteSessionFromRequest } from '@/lib/auth';
import { subirArchivo } from '@/lib/storage';

// Solo staff puede subir archivos por ahora (manuales del Centro de Ayuda,
// adjuntos de tickets) — el cliente no tiene ningún upload todavía.
export async function POST(req) {
  const session = await getAgenteSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let formData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Body inválido — tiene que ser multipart/form-data' }, { status: 400 });
  }

  const file = formData.get('file');
  const carpeta = (formData.get('carpeta') || 'general').toString().replace(/[^a-z0-9\-\/]+/gi, '');

  try {
    const { url, nombreOriginal } = await subirArchivo(file, carpeta);
    return NextResponse.json({ url, nombre: nombreOriginal }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
