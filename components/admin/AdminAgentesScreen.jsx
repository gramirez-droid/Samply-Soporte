'use client';
import React from 'react';
import { SectionBanner } from '@/components/ds/SectionBanner';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Input } from '@/components/ds/Input';
import { DataTable } from '@/components/ds/DataTable';
import { Badge } from '@/components/ds/Badge';
import { Modal } from '@/components/ds/Modal';

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function NuevoAgenteModal({ open, onClose, onCreate, submitting, error }) {
  const [nombre, setNombre] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setNombre('');
      setEmail('');
      setPassword('');
    }
  }, [open]);

  async function submit() {
    if (!nombre.trim() || !email.trim() || !password.trim()) return;
    const ok = await onCreate({ nombre, email, password });
    if (ok) {
      setNombre('');
      setEmail('');
      setPassword('');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={480}
      title="Nuevo agente"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="plus" onClick={submit} disabled={submitting || !nombre.trim() || !email.trim() || !password.trim()}>
            {submitting ? 'Creando...' : 'Crear agente'}
          </Button>
        </>
      }
    >
      {error && (
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--samply-red-50)', color: 'var(--samply-red)', fontSize: 13 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input label="Nombre" placeholder="Ej: Tomás Martínez Paisa" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <Input label="Email" type="email" placeholder="tomas.martinez@samply.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Contraseña inicial" type="text" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
    </Modal>
  );
}

export function AdminAgentesScreen() {
  const [agentes, setAgentes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [showNew, setShowNew] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState(null);
  const [togglingId, setTogglingId] = React.useState(null);
  const [deletingId, setDeletingId] = React.useState(null);

  const loadAgentes = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/agentes?todos=1');
      if (!res.ok) throw new Error('No se pudieron cargar los agentes');
      const data = await res.json();
      setAgentes(data.agentes);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAgentes();
  }, [loadAgentes]);

  const filtered = agentes.filter((a) => !search || `${a.nombre} ${a.email}`.toLowerCase().includes(search.toLowerCase()));

  async function handleCreate(nuevo) {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/admin/agentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevo),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el agente');
      setAgentes((a) => [...a, data.agente].sort((x, y) => x.nombre.localeCompare(y.nombre)));
      setShowNew(false);
      return true;
    } catch (err) {
      setCreateError(err.message);
      return false;
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActivo(agente) {
    const accion = agente.activo ? 'desactivar' : 'activar';
    if (!window.confirm(`¿${accion === 'desactivar' ? 'Desactivar' : 'Activar'} a "${agente.nombre}"?`)) return;
    setTogglingId(agente.id);
    try {
      const res = await fetch(`/api/admin/agentes/${agente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !agente.activo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el agente');
      setAgentes((as) => as.map((a) => (a.id === agente.id ? { ...a, activo: data.agente.activo } : a)));
    } catch (err) {
      window.alert(err.message);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(agente) {
    const aviso = Number(agente.tickets_count) > 0
      ? `"${agente.nombre}" está o estuvo asignado a ${agente.tickets_count} ticket(s) — no se van a borrar, solo van a dejar de tener a este agente en la lista. ¿Eliminar de todas formas?`
      : `¿Eliminar a "${agente.nombre}"? No se puede deshacer.`;
    if (!window.confirm(aviso)) return;
    setDeletingId(agente.id);
    try {
      const res = await fetch(`/api/admin/agentes/${agente.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar el agente');
      setAgentes((as) => as.filter((a) => a.id !== agente.id));
    } catch (err) {
      window.alert(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card pad="none">
        <SectionBanner
          icon="users"
          actions={
            <Button
              variant="primary"
              size="sm"
              icon="plus"
              onClick={() => setShowNew(true)}
              style={{ background: 'var(--samply-white)', color: 'var(--samply-blue)', border: '1px solid var(--samply-white)' }}
            >
              Nuevo agente
            </Button>
          }
        >
          Agentes de soporte
        </SectionBanner>

        <div style={{ padding: 16 }}>
          <Input icon="search" placeholder="Buscar por nombre o email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loadError ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--samply-red)' }}>
            {loadError} — <button onClick={loadAgentes} style={{ color: 'var(--samply-blue)', border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline' }}>reintentar</button>
          </div>
        ) : loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando agentes...</div>
        ) : (
          <DataTable
            dense
            rowKey="id"
            columns={[
              { key: 'nombre', header: 'Agente', strong: true, sortable: true },
              { key: 'email', header: 'Email' },
              { key: 'tickets_count', header: 'Tickets', render: (v) => <Badge tone="neutral" variant="soft">{v}</Badge> },
              {
                key: 'activo', header: 'Estado',
                render: (v) => v
                  ? <Badge tone="success" variant="soft">Activo</Badge>
                  : <Badge tone="danger" variant="soft">Desactivado</Badge>,
              },
              { key: 'created_at', header: 'Desde', muted: true, render: formatFecha },
              {
                key: 'acciones', header: '', width: 190,
                render: (_, row) => (
                  <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', gap: 6 }}>
                    <Button
                      variant={row.activo ? 'ghost' : 'secondary'}
                      size="sm"
                      onClick={() => handleToggleActivo(row)}
                      disabled={togglingId === row.id || deletingId === row.id}
                    >
                      {togglingId === row.id ? '...' : row.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(row)}
                      disabled={deletingId === row.id || togglingId === row.id}
                    >
                      {deletingId === row.id ? '...' : 'Eliminar'}
                    </Button>
                  </span>
                ),
              },
            ]}
            rows={filtered}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Mostrando {filtered.length} de {agentes.length} agentes</span>
        </div>
      </Card>

      <NuevoAgenteModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreate={handleCreate}
        submitting={creating}
        error={createError}
      />
    </div>
  );
}
