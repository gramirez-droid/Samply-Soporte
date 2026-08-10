'use client';
import React from 'react';
import { SectionBanner } from '@/components/ds/SectionBanner';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Input } from '@/components/ds/Input';
import { Select } from '@/components/ds/Select';
import { DataTable } from '@/components/ds/DataTable';
import { Badge } from '@/components/ds/Badge';
import { Modal } from '@/components/ds/Modal';
import { Icon } from '@/components/ds/Icon';

const MODULOS = ['App móvil (Preventa)', 'Televentas', 'B2B eCommerce', 'Inventarios', 'Facturación', 'Reportería / KPIs'];
const ROLES = ['Todos los perfiles', 'Administrador', 'Vendedor / Preventista', 'Cobrador', 'Entregador'];

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const EMPTY_FORM = { titulo: '', descripcion: '', modulo: '', rol: 'Todos los perfiles', archivoUrl: '' };

function NuevoManualModal({ open, onClose, onCreate, submitting, error }) {
  const [form, setForm] = React.useState(EMPTY_FORM);

  React.useEffect(() => {
    if (open) setForm(EMPTY_FORM);
  }, [open]);

  function set(k) {
    return (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function submit() {
    if (!form.titulo.trim() || !form.archivoUrl.trim() || !form.modulo) return;
    const ok = await onCreate(form);
    if (ok) setForm(EMPTY_FORM);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={560}
      title="Nuevo manual"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            icon="plus"
            onClick={submit}
            disabled={submitting || !form.titulo.trim() || !form.archivoUrl.trim() || !form.modulo}
          >
            {submitting ? 'Creando...' : 'Crear manual'}
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
        <Input label="Título" placeholder="Ej: Cómo levantar un pedido en la App móvil" value={form.titulo} onChange={set('titulo')} required />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Descripción</label>
          <textarea
            rows={3}
            value={form.descripcion}
            onChange={set('descripcion')}
            placeholder="De qué se trata el manual, en una o dos líneas"
            style={{ fontFamily: 'var(--font-sans)', fontSize: 14, padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid transparent', background: '#F1F5FB', resize: 'vertical', color: 'var(--text-primary)' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Módulo" placeholder="Seleccionar" options={MODULOS} value={form.modulo} onChange={set('modulo')} required />
          <Select label="Perfil" options={ROLES} value={form.rol} onChange={set('rol')} />
        </div>
        <Input label="URL del PDF" placeholder="https://... o /manuales/archivo.pdf" value={form.archivoUrl} onChange={set('archivoUrl')} required />
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Por ahora es un link (Drive, o un PDF que subiste a <code>public/manuales/</code>) — todavía no hay
          upload de archivo real desde acá, hace falta configurar un storage primero.
        </div>
      </div>
    </Modal>
  );
}

export function AdminManualesScreen() {
  const [manuales, setManuales] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const [showNew, setShowNew] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState(null);

  const loadManuales = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/manuales');
      if (!res.ok) throw new Error('No se pudieron cargar los manuales');
      const data = await res.json();
      setManuales(data.manuales);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadManuales();
  }, [loadManuales]);

  const filtered = manuales.filter((m) =>
    !search || `${m.titulo} ${m.modulo} ${m.rol}`.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(form) {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/admin/manuales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el manual');
      setManuales((m) => [...m, data.manual].sort((a, b) => a.modulo.localeCompare(b.modulo) || a.titulo.localeCompare(b.titulo)));
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
          icon="download"
          actions={
            <Button
              variant="primary"
              size="sm"
              icon="plus"
              onClick={() => setShowNew(true)}
              style={{ background: 'var(--samply-white)', color: 'var(--samply-blue)', border: '1px solid var(--samply-white)' }}
            >
              Nuevo manual
            </Button>
          }
        >
          Centro de ayuda — manuales
        </SectionBanner>

        <div style={{ padding: 16 }}>
          <Input icon="search" placeholder="Buscar por título, módulo o perfil" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loadError ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--samply-red)' }}>
            {loadError} — <button onClick={loadManuales} style={{ color: 'var(--samply-blue)', border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline' }}>reintentar</button>
          </div>
        ) : loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando manuales...</div>
        ) : (
          <DataTable
            dense
            rowKey="id"
            columns={[
              { key: 'titulo', header: 'Título', strong: true, wrap: true, sortable: true },
              { key: 'modulo', header: 'Módulo', render: (v) => <Badge tone="neutral" variant="soft">{v}</Badge> },
              { key: 'rol', header: 'Perfil', render: (v) => <Badge tone="info" variant="soft">{v}</Badge> },
              { key: 'created_at', header: 'Cargado', muted: true, render: formatFecha },
              {
                key: 'archivo_url', header: '', width: 90,
                render: (v) => (
                  <a href={v} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" icon="download">Ver</Button>
                  </a>
                ),
              },
            ]}
            rows={filtered}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Mostrando {filtered.length} de {manuales.length} manuales</span>
        </div>
      </Card>

      <NuevoManualModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreate={handleCreate}
        submitting={creating}
        error={createError}
      />
    </div>
  );
}
