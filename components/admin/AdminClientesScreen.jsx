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

function NuevoClienteModal({ open, onClose, onCreate, submitting, error }) {
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
      title="Nuevo cliente"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            icon="plus"
            onClick={submit}
            disabled={submitting || !nombre.trim() || !email.trim() || !password.trim()}
          >
            {submitting ? 'Creando...' : 'Crear cliente'}
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
        <Input label="Nombre de la distribuidora" placeholder="Ej: Distribuidora del Valle" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <Input label="Email" type="email" placeholder="contacto@distribuidora.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Contraseña inicial" type="text" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Esta contraseña la usa el cliente para entrar a su panel — pasásela por el canal que uses siempre con ellos.
          Se guarda encriptada, nunca en texto plano.
        </div>
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

  const filtered = clientes.filter((c) =>
    !search || `${c.nombre} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(nuevo) {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/admin/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevo),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el cliente');
      setClientes((c) => [...c, { ...data.cliente, tickets_count: 0 }].sort((a, b) => a.nombre.localeCompare(b.nombre)));
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
              Nuevo cliente
            </Button>
          }
        >
          Clientes
        </SectionBanner>

        <div style={{ padding: 16 }}>
          <Input icon="search" placeholder="Buscar por nombre o email" value={search} onChange={(e) => setSearch(e.target.value)} />
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
            columns={[
              { key: 'nombre', header: 'Distribuidora', strong: true, sortable: true },
              { key: 'email', header: 'Email' },
              { key: 'tickets_count', header: 'Tickets', render: (v) => <Badge tone="neutral" variant="soft">{v}</Badge> },
              { key: 'created_at', header: 'Cliente desde', muted: true, render: formatFecha },
            ]}
            rows={filtered}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Mostrando {filtered.length} de {clientes.length} clientes</span>
        </div>
      </Card>

      <NuevoClienteModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreate={handleCreate}
        submitting={creating}
        error={createError}
      />
    </div>
  );
}
