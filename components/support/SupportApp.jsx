'use client';
import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { TicketsScreen } from './TicketsScreen';
import { CentroAyudaScreen } from './CentroAyudaScreen';

export function SupportApp({ clienteNombre }) {
  const [nav, setNav] = React.useState('tickets');

  return (
    <AppShell clienteNombre={clienteNombre} active={nav} onSelect={setNav}>
      {nav === 'ayuda' ? <CentroAyudaScreen /> : <TicketsScreen />}
    </AppShell>
  );
}
