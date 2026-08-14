import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { subirArchivo } from '@/lib/storage';

// Versión para el cliente de /api/admin/upload — mismo storage, mismas
// validaciones, solo cambia el chequeo de sesión (cliente en vez de agente).
export async function POST(req) {
  const session = await getSessionFromRequest(req);
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

  try {
    const { url, nombreOriginal } = await subirArchivo(file, 'tickets-nuevos');
    return NextResponse.json({ url, nombre: nombreOriginal }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
