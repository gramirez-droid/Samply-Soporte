'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/ds/Sidebar';
import { Avatar } from '@/components/ds/Avatar';
import { Icon } from '@/components/ds/Icon';
import { TopBar } from '@/components/layout/TopBar';

// Este panel es standalone (su propio link, no vive dentro del Backoffice
// completo de Samply) — por eso la nav tiene solo lo que existe acá:
// Tickets y Centro de ayuda. Nada de Torre de Control / Clientes / Pedidos, etc.
const NAV = [
  { id: 'tickets', label: 'Tickets', icon: 'message' },
  { id: 'ayuda', label: 'Centro de ayuda', icon: 'download' },
];

export function AppShell({ clienteNombre, usuarioNombre, active, onSelect, children }) {
  const [expanded, setExpanded] = React.useState(true);
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const footer = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
      <Avatar name={usuarioNombre} size="sm" tone="blue" />
      {expanded && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {usuarioNombre}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {clienteNombre}
          </div>
        </div>
      )}
      {expanded && (
        <button
          type="button"
          onClick={handleLogout}
          title="Cerrar sesión"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
        >
          <Icon name="log-out" size={18} color="rgba(255,255,255,0.6)" />
        </button>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        items={NAV}
        active={active}
        onSelect={onSelect}
        expanded={expanded}
        onToggleExpand={() => setExpanded((e) => !e)}
        logoSrc={expanded ? '/logos/samply-logo-reversed.png' : '/logos/samply-mark.png'}
        footer={footer}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar distributor={clienteNombre} onLogout={handleLogout} />
        <main style={{ flex: 1, overflowY: 'auto' }}>{children}</main>
      </div>
    </div>
  );
}
