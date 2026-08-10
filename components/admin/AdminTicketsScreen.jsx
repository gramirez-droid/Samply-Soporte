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
import { stateBadge, priorityBadge, slaBadge } from '@/components/support/badges';
import { AdminTicketDetailModal } from './AdminTicketDetailModal';
import {
  CATEGORIAS,
  PRIORIDADES,
  STATE_BADGE,
  mapTicketAdmin,
  porcentajeCumplimientoSLA,
} from '@/components/support/constants';

export function AdminTicketsScreen() {
  const [tab, setTab] = React.useState('todos');
  const [detail, setDetail] = React.useState(null);
  const [rows, setRows] = React.useState([]);
  const [agentes, setAgentes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(null);
  const [sincronizando, setSincronizando] = React.useState(false);

  const [search, setSearch] = React.useState('');
  const [filtroCategoria, setFiltroCategoria] = React.useState('');
  const [filtroPrioridad, setFiltroPrioridad] = React.useState('');
  const [filtroEstado, setFiltroEstado] = React.useState('');
  const [filtroAgente, setFiltroAgente] = React.useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = React.useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = React.useState('');

  const hayFiltrosActivos =
    search || filtroCategoria || filtroPrioridad || filtroEstado || filtroAgente || filtroFechaDesde || filtroFechaHasta;

  function limpiarFiltros() {
    setSearch('');
    setFiltroCategoria('');
    setFiltroPrioridad('');
    setFiltroEstado('');
    setFiltroAgente('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
  }

  const loadTickets = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/tickets');
      if (!res.ok) throw new Error('No se pudieron cargar los tickets');
      const data = await res.json();
      setRows(data.tickets.map(mapTicketAdmin));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadTickets();
    fetch('/api/admin/agentes')
      .then((res) => res.json())
      .then((data) => setAgentes(data.agentes || []))
      .catch(() => setAgentes([]));
  }, [loadTickets]);

  const abiertos = rows.filter((t) => !['Resuelto', 'Cerrado'].includes(t.estado));
  const sinAsignar = rows.filter((t) => t.agentes.length === 0 && !['Resuelto', 'Cerrado'].includes(t.estado));
  const resueltos = rows.filter((t) => t.estado === 'Resuelto');
  const cumplimientoSLA = porcentajeCumplimientoSLA(rows);

  const filtered = rows.filter((t) => {
    if (tab === 'abiertos' && ['Resuelto', 'Cerrado'].includes(t.estado)) return false;
    if (tab === 'sin_asignar' && (t.agentes.length > 0 || ['Resuelto', 'Cerrado'].includes(t.estado))) return false;
    if (tab === 'resueltos' && t.estado !== 'Resuelto') return false;
    if (search && !`${t.id} ${t.asunto} ${t.clienteNombre}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filtroCategoria && t.categoria !== filtroCategoria) return false;
    if (filtroPrioridad && t.prioridad !== filtroPrioridad) return false;
    if (filtroEstado && t.estado !== filtroEstado) return false;
    if (filtroAgente === 'sin_asignar' && t.agentes.length > 0) return false;
    if (filtroAgente && filtroAgente !== 'sin_asignar' && !t.agentes.some((a) => String(a.id) === filtroAgente)) return false;
    if (filtroFechaDesde && new Date(t.fechaCreacionRaw) < new Date(`${filtroFechaDesde}T00:00:00`)) return false;
    if (filtroFechaHasta && new Date(t.fechaCreacionRaw) > new Date(`${filtroFechaHasta}T23:59:59`)) return false;
    return true;
  });

  async function handleUpdate(dbId, patch) {
    try {
      const res = await fetch(`/api/admin/tickets/${dbId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el ticket');
      const updated = mapTicketAdmin(data.ticket);
      setRows((rs) => rs.map((r) => (r.dbId === updated.dbId ? updated : r)));
      setDetail((d) => (d && d.dbId === updated.dbId ? updated : d));
    } catch (err) {
      window.alert(err.message);
    }
  }

  async function handleAgregarAgente(dbId, agenteId) {
    try {
      const res = await fetch(`/api/admin/tickets/${dbId}/agentes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agenteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo agregar el agente');
      const updated = mapTicketAdmin(data.ticket);
      setRows((rs) => rs.map((r) => (r.dbId === updated.dbId ? updated : r)));
      setDetail((d) => (d && d.dbId === updated.dbId ? updated : d));
    } catch (err) {
      window.alert(err.message);
    }
  }

  async function handleQuitarAgente(dbId, agenteId) {
    try {
      const res = await fetch(`/api/admin/tickets/${dbId}/agentes/${agenteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo quitar el agente');
      const updated = mapTicketAdmin(data.ticket);
      setRows((rs) => rs.map((r) => (r.dbId === updated.dbId ? updated : r)));
      setDetail((d) => (d && d.dbId === updated.dbId ? updated : d));
    } catch (err) {
      window.alert(err.message);
    }
  }

  async function handleSincronizarNotion() {
    setSincronizando(true);
    try {
      const res = await fetch('/api/admin/notion/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo sincronizar con Notion');
      window.alert(`Sincronizado — ${data.actualizados} ticket(s) actualizados desde Notion.`);
      loadTickets();
    } catch (err) {
      window.alert(err.message);
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard value={abiertos.length} label="Tickets abiertos" icon="alert-circle" />
        <KpiCard value={sinAsignar.length} label="Sin asignar" icon="clock" accent="var(--samply-amber)" />
        <KpiCard value={resueltos.length} label="Resueltos" icon="check-circle" accent="var(--samply-green)" />
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
              icon="download"
              onClick={handleSincronizarNotion}
              disabled={sincronizando}
              style={{ background: 'var(--samply-white)', color: 'var(--samply-blue)', border: '1px solid var(--samply-white)' }}
            >
              {sincronizando ? 'Sincronizando...' : 'Sincronizar con Notion'}
            </Button>
          }
        >
          Tickets de soporte — todos los clientes
        </SectionBanner>

        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <Input icon="search" placeholder="Buscar por ticket, asunto o cliente" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select placeholder="Categoría" options={CATEGORIAS} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} />
          <Select placeholder="Prioridad" options={PRIORIDADES} value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} />
          <Select placeholder="Estado" options={Object.keys(STATE_BADGE)} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} />
        </div>

        <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, alignItems: 'end' }}>
          <Select
            placeholder="Agente"
            options={[{ value: 'sin_asignar', label: 'Sin asignar' }, ...agentes.map((a) => ({ value: String(a.id), label: a.nombre }))]}
            value={filtroAgente}
            onChange={(e) => setFiltroAgente(e.target.value)}
          />
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
              { id: 'sin_asignar', label: 'Sin asignar', count: sinAsignar.length },
              { id: 'resueltos', label: 'Resueltos', count: resueltos.length },
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
              { key: 'clienteNombre', header: 'Cliente', sortable: true },
              { key: 'asunto', header: 'Asunto', wrap: true },
              { key: 'prioridad', header: 'Prioridad', sortable: true, render: priorityBadge },
              { key: 'estado', header: 'Estado', sortable: true, render: stateBadge },
              {
                key: 'agentes',
                header: 'Agentes',
                render: (v) =>
                  !v || v.length === 0 ? (
                    <Badge tone="neutral" variant="outline">Sin asignar</Badge>
                  ) : (
                    <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                      {v.map((a) => <Badge key={a.id} tone="info" variant="soft">{a.nombre}</Badge>)}
                    </span>
                  ),
              },
              { key: 'sla', header: 'SLA', render: (_, row) => slaBadge(row) },
              { key: 'fecha', header: 'Fecha', muted: true, sortable: true },
              {
                key: 'act', header: '', width: 50,
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

      <AdminTicketDetailModal
        ticket={detail}
        agentes={agentes}
        onClose={() => setDetail(null)}
        onUpdate={handleUpdate}
        onAgregarAgente={handleAgregarAgente}
        onQuitarAgente={handleQuitarAgente}
      />
    </div>
  );
}
