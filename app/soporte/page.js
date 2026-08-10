import { headers } from 'next/headers';
import { SupportApp } from '@/components/support/SupportApp';

export const metadata = { title: 'Samply · Soporte' };

export default function SoportePage() {
  // El middleware ya validó el JWT y nos deja estos datos en los headers
  // de la request (ver middleware.js) — no hace falta re-verificar acá.
  const headersList = headers();
  const clienteNombre = headersList.get('x-cliente-nombre') || 'Cliente Samply';

  return <SupportApp clienteNombre={clienteNombre} />;
}
