'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/ds/Sidebar';
import { Avatar } from '@/components/ds/Avatar';
import { Icon } from '@/components/ds/Icon';

const NAV = [
  { id: 'tickets', label: 'Tickets', icon: 'message' },
  { id: 'clientes', label: 'Clientes', icon: 'users' },
  { id: 'agentes', label: 'Agentes', icon: 'users' },
  { id: 'manuales', label: 'Centro de ayuda', icon: 'download' },
];

export function AdminShell({ agenteNombre, active, onSelect, children }) {
  const [expanded, setExpanded] = React.useState(true);
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  const footer = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
      <Avatar name={agenteNombre} size="sm" tone="blue" />
      {expanded && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {agenteNombre}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Staff Samply</div>
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
        <header
          style={{
            height: 'var(--topbar-height)',
            flex: 'none',
            background: 'var(--samply-navy)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 28px',
            gap: 10,
          }}
        >
          <Icon name="bot" size={18} color="var(--samply-blue-light)" />
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', letterSpacing: 'var(--ls-wide)', textTransform: 'uppercase' }}>
            Panel de staff — Samply
          </div>
        </header>
        <main style={{ flex: 1, overflowY: 'auto' }}>{children}</main>
      </div>
    </div>
  );
}
