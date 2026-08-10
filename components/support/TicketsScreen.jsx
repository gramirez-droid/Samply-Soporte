'use client';
import React from 'react';
import { SectionBanner } from '@/components/ds/SectionBanner';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Input } from '@/components/ds/Input';
import { Select } from '@/components/ds/Select';
import { DataTable } from '@/components/ds/DataTable';
import { Badge } from '@/components/ds/Badge';
import { IconButton } from '@/components/ds/IconButton';
import { Tabs } from '@/components/ds/Tabs';
import { KpiCard } from '@/components/ds/KpiCard';
import { stateBadge, priorityBadge, slaBadge } from './badges';
import { TicketDetailModal } from './TicketDetailModal';
import { NewTicketModal } from './NewTicketModal';
import { CATEGORIAS, PRIORIDADES, STATE_BADGE, mapTicket, porcentajeCumplimientoSLA } from './constants';

export function TicketsScreen() {
  const [tab, setTab] = React.useState('todos');
  const [detail, setDetail] = React.useState(null);
  const [showNew, setShowNew] = React.useState(false);
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(null);
  const [createError, setCreateError] = React.useState(null);
  const [creating, setCreating] = React.useState(false);

  const [search, setSearch] = React.useState('');
  const [filtroCategoria, setFiltroCategoria] = React.useState('');
  const [filtroPrioridad, setFiltroPrioridad] = React.useState('');
  const [filtroEstado, setFiltroEstado] = React.useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = React.useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = React.useState('');

  const hayFiltrosActivos =
    search || filtroCategoria || filtroPrioridad || filtroEstado || filtroFechaDesde || filtroFechaHasta;

  function limpiarFiltros() {
    setSearch('');
    setFiltroCategoria('');
    setFiltroPrioridad('');
    setFiltroEstado('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
  }

  const loadTickets = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/tickets');
      if (!res.ok) throw new Error('No se pudieron cargar los tickets');
      const data = await res.json();
      setRows(data.tickets.map(mapTicket));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const abiertos = rows.filter((t) => !['Resuelto', 'Cerrado'].includes(t.estado));
  const enProgreso = rows.filter((t) => t.estado === 'En progreso');
  const resueltosEsteMes = rows.filter((t) => t.estado === 'Resuelto');
  const cumplimientoSLA = porcentajeCumplimientoSLA(rows);

  const filtered = rows.filter((t) => {
    if (tab === 'abiertos' && ['Resuelto', 'Cerrado'].includes(t.estado)) return false;
    if (tab === 'progreso' && t.estado !== 'En progreso') return false;
    if (tab === 'resueltos' && t.estado !== 'Resuelto') return false;
    if (search && !`${t.id} ${t.asunto}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filtroCategoria && t.categoria !== filtroCategoria) return false;
    if (filtroPrioridad && t.prioridad !== filtroPrioridad) return false;
    if (filtroEstado && t.estado !== filtroEstado) return false;
    if (filtroFechaDesde && new Date(t.fechaCreacionRaw) < new Date(`${filtroFechaDesde}T00:00:00`)) return false;
    if (filtroFechaHasta && new Date(t.fechaCreacionRaw) > new Date(`${filtroFechaHasta}T23:59:59`)) return false;
    return true;
  });

  async function handleCreate(nuevo) {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevo),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el ticket');
      setRows((r) => [mapTicket(data.ticket), ...r]);
      setShowNew(false);
      return true;
    } catch (err) {
      setCreateError(err.message);
      return false;
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard value={abiertos.length} label="Tickets abiertos" icon="alert-circle" />
        <KpiCard value={enProgreso.length} label="En progreso" icon="clock" accent="var(--samply-blue-light)" />
        <KpiCard value={resueltosEsteMes.length} label="Resueltos" icon="check-circle" accent="var(--samply-green)" />
        <KpiCard
          value={cumplimientoSLA != null ? `${cumplimientoSLA}%` : '—'}
          label="Cumplimiento SLA"
          icon="clock"
          accent={cumplimientoSLA != null && cumplimientoSLA < 80 ? 'var(--samply-red)' : 'var(--samply-green)'}
        />
      </div>

      <Card pad="none">
        <SectionBanner
          icon="message"
          actions={
            <Button
              variant="primary"
              size="sm"
              icon="plus"
              onClick={() => setShowNew(true)}
              style={{ background: 'var(--samply-white)', color: 'var(--samply-blue)', border: '1px solid var(--samply-white)' }}
            >
              Nuevo ticket
            </Button>
          }
        >
          Tickets de soporte
        </SectionBanner>

        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <Input icon="search" placeholder="Buscar por asunto o ID" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select placeholder="Categoría" options={CATEGORIAS} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} />
          <Select placeholder="Prioridad" options={PRIORIDADES} value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} />
          <Select placeholder="Estado" options={Object.keys(STATE_BADGE)} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} />
        </div>

        <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, alignItems: 'end' }}>
          <Input type="date" label="Creado desde" value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)} />
          <Input type="date" label="Creado hasta" value={filtroFechaHasta} onChange={(e) => setFiltroFechaHasta(e.target.value)} />
          {hayFiltrosActivos && (
            <Button variant="ghost" size="sm" icon="x" onClick={limpiarFiltros}>
              Limpiar filtros
            </Button>
          )}
        </div>

        <div style={{ padding: '0 16px' }}>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'todos', label: 'Todos', count: rows.length },
              { id: 'abiertos', label: 'Abiertos', count: abiertos.length },
              { id: 'progreso', label: 'En progreso', count: enProgreso.length },
              { id: 'resueltos', label: 'Resueltos', count: resueltosEsteMes.length },
            ]}
          />
        </div>

        {loadError ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--samply-red)' }}>
            {loadError} — <button onClick={loadTickets} style={{ color: 'var(--samply-blue)', border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline' }}>reintentar</button>
          </div>
        ) : loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando tickets...</div>
        ) : (
          <DataTable
            dense
            rowKey="id"
            onRowClick={(r) => setDetail(r)}
            columns={[
              { key: 'id', header: 'Ticket', strong: true, sortable: true },
              { key: 'asunto', header: 'Asunto', wrap: true },
              { key: 'categoria', header: 'Categoría', render: (v) => <Badge tone="neutral">{v}</Badge> },
              { key: 'prioridad', header: 'Prioridad', sortable: true, render: priorityBadge },
              { key: 'estado', header: 'Estado', sortable: true, render: stateBadge },
              { key: 'sla', header: 'SLA', render: (_, row) => slaBadge(row) },
              { key: 'fecha', header: 'Fecha', muted: true, sortable: true },
              {
                key: 'act',
                header: '',
                width: 50,
                render: (_, row) => (
                  <span onClick={(e) => e.stopPropagation()}>
                    <IconButton icon="eye" tone="info" size="sm" title="Ver detalle" onClick={() => setDetail(row)} />
                  </span>
                ),
              },
            ]}
            rows={filtered}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Mostrando {filtered.length} de {rows.length} tickets</span>
        </div>
      </Card>

      <TicketDetailModal ticket={detail} onClose={() => setDetail(null)} />
      <NewTicketModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreate={handleCreate}
        submitting={creating}
        error={createError}
      />
    </div>
  );
}
