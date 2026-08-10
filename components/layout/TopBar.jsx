'use client';
import React from 'react';
import { Icon } from '@/components/ds/Icon';

/* Backoffice top bar — white, distributor name in blue, language + user controls. */
export function TopBar({ distributor = 'Cliente Samply', onLogout }) {
  const initials = (distributor || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        flex: 'none',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
      }}
    >
      <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--samply-blue)' }}>{distributor}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="button" title="Notificaciones" style={ctrlBtn}>
          <Icon name="bell" size={18} color="var(--samply-blue)" />
        </button>
        <button type="button" onClick={onLogout} title="Cerrar sesión" style={ctrlBtn}>
          <Icon name="log-out" size={18} color="var(--samply-blue)" />
        </button>
        <button type="button" title={distributor} style={{ ...ctrlBtn, gap: 8, width: 'auto', padding: '0 6px' }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'var(--samply-navy)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {initials || 'CL'}
          </span>
        </button>
      </div>
    </header>
  );
}

const ctrlBtn = {
  width: 38,
  height: 38,
  borderRadius: '50%',
  border: '1.5px solid var(--samply-blue-light)',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};
