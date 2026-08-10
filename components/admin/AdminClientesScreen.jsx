'use client';
import React from 'react';
import { SectionBanner } from '@/components/ds/SectionBanner';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Input } from '@/components/ds/Input';
import { DataTable } from '@/components/ds/DataTable';
import { Badge } from '@/components/ds/Badge';
import { Modal } from '@/components/ds/Modal';
import { ClienteUsuariosModal } from './ClienteUsuariosModal';

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function NuevaEmpresaModal({ open, onClose, onCreate, submitting, error }) {
  const [nombre, setNombre] = React.useState('');

  React.useEffect(() => {
    if (open) setNombre('');
  }, [open]);

  async function submit() {
    if (!nombre.trim()) return;
    await onCreate(nombre);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={440}
      title="Nueva empresa"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="plus" onClick={submit} disabled={submitting || !nombre.trim()}>
            {submitting ? 'Creando...' : 'Crear empresa'}
          </Button>
        </>
      }
    >
      {error && (
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--samply-red-50)', color: 'var(--samply-red)', fontSize: 13 }}>
          {error}
        </div>
      )}
      <Input label="Nombre de la empresa" placeholder="Ej: Distribuidora del Valle" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 10 }}>
        Esto crea solo la empresa. Después de crearla te va a aparecer el modal para
        agregarle sus usuarios (nombre, email y contraseña de cada uno) — una empresa
        puede tener varios usuarios levantando tickets.
      </div>
    </Modal>
  );
}

export function AdminClientesScreen() {
  const [clientes, setClientes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [showNew, setShowNew] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState(null);
  const [togglingId, setTogglingId] = React.useState(null);
  const [clienteUsuarios, setClienteUsuarios] = React.useState(null); // empresa cuyos usuarios se están viendo

  const loadClientes = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/clientes');
      if (!res.ok) throw new Error('No se pudieron cargar los clientes');
      const data = await res.json();
      setClientes(data.clientes);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  const filtered = clientes.filter((c) => !search || c.nombre.toLowerCase().includes(search.toLowerCase()));

  async function handleCreate(nombre) {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/admin/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear la empresa');
      setClientes((c) => [...c, data.cliente].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setShowNew(false);
      // Abrimos directo el modal de usuarios de la empresa recién creada —
      // sin usuarios todavía, no puede loguearse nadie.
      setClienteUsuarios(data.cliente);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActivo(cliente) {
    const accion = cliente.activo ? 'desactivar' : 'activar';
    if (!window.confirm(`¿${accion === 'desactivar' ? 'Desactivar' : 'Activar'} a "${cliente.nombre}"? ${accion === 'desactivar' ? 'Ninguno de sus usuarios va a poder loguearse hasta que la reactives.' : ''}`)) {
      return;
    }
    setTogglingId(cliente.id);
    try {
      const res = await fetch(`/api/admin/clientes/${cliente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !cliente.activo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la empresa');
      setClientes((cs) => cs.map((c) => (c.id === cliente.id ? { ...c, activo: data.cliente.activo } : c)));
    } catch (err) {
      window.alert(err.message);
    } finally {
      setTogglingId(null);
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
              Nueva empresa
            </Button>
          }
        >
          Clientes
        </SectionBanner>

        <div style={{ padding: 16 }}>
          <Input icon="search" placeholder="Buscar por nombre de empresa" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loadError ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--samply-red)' }}>
            {loadError} — <button onClick={loadClientes} style={{ color: 'var(--samply-blue)', border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline' }}>reintentar</button>
          </div>
        ) : loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando clientes...</div>
        ) : (
          <DataTable
            dense
            rowKey="id"
            onRowClick={(row) => setClienteUsuarios(row)}
            columns={[
              { key: 'nombre', header: 'Empresa', strong: true, sortable: true },
              {
                key: 'usuarios_count', header: 'Usuarios',
                render: (v) => <Badge tone={Number(v) === 0 ? 'warning' : 'neutral'} variant="soft">{v}</Badge>,
              },
              { key: 'tickets_count', header: 'Tickets', render: (v) => <Badge tone="neutral" variant="soft">{v}</Badge> },
              {
                key: 'activo', header: 'Estado',
                render: (v) => v
                  ? <Badge tone="success" variant="soft">Activa</Badge>
                  : <Badge tone="danger" variant="soft">Desactivada</Badge>,
              },
              { key: 'created_at', header: 'Cliente desde', muted: true, render: formatFecha },
              {
                key: 'acciones', header: '', width: 140,
                render: (_, row) => (
                  <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', gap: 6 }}>
                    <Button variant="ghost" size="sm" onClick={() => setClienteUsuarios(row)}>Usuarios</Button>
                    <Button
                      variant={row.activo ? 'ghost' : 'secondary'}
                      size="sm"
                      onClick={() => handleToggleActivo(row)}
                      disabled={togglingId === row.id}
                    >
                      {togglingId === row.id ? '...' : row.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </span>
                ),
              },
            ]}
            rows={filtered}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Mostrando {filtered.length} de {clientes.length} clientes</span>
        </div>
      </Card>

      <NuevaEmpresaModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreate={handleCreate}
        submitting={creating}
        error={createError}
      />

      <ClienteUsuariosModal
        cliente={clienteUsuarios}
        onClose={() => {
          setClienteUsuarios(null);
          loadClientes(); // refresca el contador de usuarios en la tabla
        }}
      />
    </div>
  );
}
