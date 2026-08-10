import { headers } from 'next/headers';
import { AdminApp } from '@/components/admin/AdminApp';

export const metadata = { title: 'Samply · Panel de staff' };

export default function AdminSoportePage() {
  const headersList = headers();
  const agenteNombre = headersList.get('x-agente-nombre') || 'Staff Samply';

  return <AdminApp agenteNombre={agenteNombre} />;
}
