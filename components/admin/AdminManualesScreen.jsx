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
import { IconButton } from '@/components/ds/IconButton';

const MODULOS = ['App móvil (Preventa)', 'Televentas', 'B2B eCommerce', 'Inventarios', 'Facturación', 'Reportería / KPIs'];
const ROLES = ['Todos los perfiles', 'Administrador', 'Vendedor / Preventista', 'Cobrador', 'Entregador'];

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const EMPTY_FORM = { titulo: '', descripcion: '', modulo: '', rol: 'Todos los perfiles', archivoUrl: '' };

// Un solo modal para crear Y editar — si viene con `manual`, arranca
// precargado y manda PATCH en vez de POST.
function ManualModal({ open, onClose, onSave, submitting, error, manual }) {
  const [form, setForm] = React.useState(EMPTY_FORM);
  const editando = Boolean(manual);

  React.useEffect(() => {
    if (open) {
      setForm(
        manual
          ? {
              titulo: manual.titulo,
              descripcion: manual.descripcion || '',
              modulo: manual.modulo,
              rol: manual.rol,
              archivoUrl: manual.archivo_url,
            }
          : EMPTY_FORM
      );
    }
  }, [open, manual]);

  function set(k) {
    return (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function submit() {
    if (!form.titulo.trim() || !form.archivoUrl.trim() || !form.modulo) return;
    const ok = await onSave(form);
    if (ok) setForm(EMPTY_FORM);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={560}
      title={editando ? `Editar manual · ${manual.titulo}` : 'Nuevo manual'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            icon={editando ? 'check' : 'plus'}
            onClick={submit}
            disabled={submitting || !form.titulo.trim() || !form.archivoUrl.trim() || !form.modulo}
          >
            {submitting ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear manual'}
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
  const [showModal, setShowModal] = React.useState(false);
  const [editingManual, setEditingManual] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState(null);

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

  function abrirNuevo() {
    setEditingManual(null);
    setSaveError(null);
    setShowModal(true);
  }

  function abrirEditar(manual) {
    setEditingManual(manual);
    setSaveError(null);
    setShowModal(true);
  }

  async function handleSave(form) {
    setSaving(true);
    setSaveError(null);
    try {
      const url = editingManual ? `/api/admin/manuales/${editingManual.id}` : '/api/admin/manuales';
      const method = editingManual ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el manual');

      if (editingManual) {
        setManuales((ms) => ms.map((m) => (m.id === data.manual.id ? data.manual : m)));
      } else {
        setManuales((ms) => [...ms, data.manual].sort((a, b) => a.modulo.localeCompare(b.modulo) || a.titulo.localeCompare(b.titulo)));
      }
      setShowModal(false);
      return true;
    } catch (err) {
      setSaveError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(manual) {
    if (!window.confirm(`¿Borrar "${manual.titulo}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/admin/manuales/${manual.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo borrar el manual');
      setManuales((ms) => ms.filter((m) => m.id !== manual.id));
    } catch (err) {
      window.alert(err.message);
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
              onClick={abrirNuevo}
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
                key: 'acciones', header: '', width: 140,
                render: (_, row) => (
                  <span style={{ display: 'inline-flex', gap: 2 }}>
                    <a href={row.archivo_url} target="_blank" rel="noopener noreferrer">
                      <IconButton icon="download" tone="info" size="sm" title="Ver PDF" />
                    </a>
                    <IconButton icon="edit" tone="default" size="sm" title="Editar" onClick={() => abrirEditar(row)} />
                    <IconButton icon="x" tone="danger" size="sm" title="Borrar" onClick={() => handleDelete(row)} />
                  </span>
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

      <ManualModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        submitting={saving}
        error={saveError}
        manual={editingManual}
      />
    </div>
  );
}
