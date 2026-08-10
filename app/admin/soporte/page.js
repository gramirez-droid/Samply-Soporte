import { headers } from 'next/headers';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminTicketsScreen } from '@/components/admin/AdminTicketsScreen';

export const metadata = { title: 'Samply · Panel de staff' };

export default function AdminSoportePage() {
  const headersList = headers();
  const agenteNombre = headersList.get('x-agente-nombre') || 'Staff Samply';

  return (
    <AdminShell agenteNombre={agenteNombre}>
      <AdminTicketsScreen />
    </AdminShell>
  );
}
