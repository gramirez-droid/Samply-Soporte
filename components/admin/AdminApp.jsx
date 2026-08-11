'use client';
import React from 'react';
import { AdminShell } from './AdminShell';
import { AdminTicketsScreen } from './AdminTicketsScreen';
import { AdminClientesScreen } from './AdminClientesScreen';
import { AdminManualesScreen } from './AdminManualesScreen';
import { AdminAgentesScreen } from './AdminAgentesScreen';
import { AdminNotificacionesScreen } from './AdminNotificacionesScreen';

export function AdminApp({ agenteNombre }) {
  const [nav, setNav] = React.useState('tickets');

  return (
    <AdminShell agenteNombre={agenteNombre} active={nav} onSelect={setNav}>
      {nav === 'clientes' ? <AdminClientesScreen />
        : nav === 'manuales' ? <AdminManualesScreen />
        : nav === 'agentes' ? <AdminAgentesScreen />
        : nav === 'notificaciones' ? <AdminNotificacionesScreen />
        : <AdminTicketsScreen />}
    </AdminShell>
  );
}
