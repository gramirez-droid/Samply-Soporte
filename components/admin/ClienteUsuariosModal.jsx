'use client';
import React from 'react';
import { Modal } from '@/components/ds/Modal';
import { Button } from '@/components/ds/Button';
import { Input } from '@/components/ds/Input';
import { Badge } from '@/components/ds/Badge';

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const EMPTY_FORM = { nombre: '', email: '', password: '' };

export function ClienteUsuariosModal({ cliente, onClose }) {
  const [usuarios, setUsuarios] = React.useState(null);
  const [loadError, setLoadError] = React.useState(null);
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState(null);
  const [togglingId, setTogglingId] = React.useState(null);

  const cargar = React.useCallback(() => {
    if (!cliente) return;
    setLoadError(null);
    fetch(`/api/admin/clientes/${cliente.id}/usuarios`)
      .then((res) => {
        if (!res.ok) throw new Error('No se pudieron cargar los usuarios');
        return res.json();
      })
      .then((data) => setUsuarios(data.usuarios))
      .catch((err) => setLoadError(err.message));
  }, [cliente]);

  React.useEffect(() => {
    setUsuarios(null);
    setForm(EMPTY_FORM);
    setCreateError(null);
    cargar();
  }, [cliente, cargar]);

  if (!cliente) return null;

  function set(k) {
    return (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function crear() {
    if (!form.nombre.trim() || !form.email.trim() || !form.password.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch(`/api/admin/clientes/${cliente.id}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el usuario');
      setUsuarios((us) => [...(us || []), data.usuario].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setForm(EMPTY_FORM);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActivo(usuario) {
    const accion = usuario.activo ? 'desactivar' : 'activar';
    if (!window.confirm(`¿${accion === 'desactivar' ? 'Desactivar' : 'Activar'} a "${usuario.nombre}"?`)) return;
    setTogglingId(usuario.id);
    try {
      const res = await fetch(`/api/admin/clientes/${cliente.id}/usuarios/${usuario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !usuario.activo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el usuario');
      setUsuarios((us) => us.map((u) => (u.id === usuario.id ? data.usuario : u)));
    } catch (err) {
      window.alert(err.message);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <Modal
      open={!!cliente}
      onClose={onClose}
      width={560}
      title={`Usuarios de ${cliente.nombre}`}
      footer={<Button variant="ghost" onClick={onClose}>Cerrar</Button>}
    >
      <div style={{ marginBottom: 16 }}>
        {loadError ? (
          <div style={{ fontSize: 13, color: 'var(--samply-red)' }}>{loadError}</div>
        ) : usuarios === null ? (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cargando usuarios...</div>
        ) : usuarios.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Esta empresa todavía no tiene ningún usuario — sin uno cargado, nadie de acá se puede loguear.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {usuarios.map((u) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{u.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email} — desde {formatFecha(u.created_at)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {u.activo
                    ? <Badge tone="success" variant="soft">Activo</Badge>
                    : <Badge tone="danger" variant="soft">Desactivado</Badge>}
                  <Button
                    variant={u.activo ? 'ghost' : 'secondary'}
                    size="sm"
                    onClick={() => toggleActivo(u)}
                    disabled={togglingId === u.id}
                  >
                    {togglingId === u.id ? '...' : u.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Agregar nuevo usuario</div>
        {createError && (
          <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--samply-red-50)', color: 'var(--samply-red)', fontSize: 13 }}>
            {createError}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Input label="Nombre" placeholder="Ej: Juan Pérez" value={form.nombre} onChange={set('nombre')} />
          <Input label="Email" type="email" placeholder="juan@distribuidora.com" value={form.email} onChange={set('email')} />
          <Input label="Contraseña inicial" type="text" placeholder="Mínimo 6 caracteres" value={form.password} onChange={set('password')} />
          <Button
            variant="primary"
            size="sm"
            icon="plus"
            onClick={crear}
            disabled={creating || !form.nombre.trim() || !form.email.trim() || !form.password.trim()}
          >
            {creating ? 'Creando...' : 'Crear usuario'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
