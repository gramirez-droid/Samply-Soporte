'use client';
import React from 'react';
import { SectionBanner } from '@/components/ds/SectionBanner';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Input } from '@/components/ds/Input';
import { IconButton } from '@/components/ds/IconButton';

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function AdminNotificacionesScreen() {
  const [emails, setEmails] = React.useState(null);
  const [loadError, setLoadError] = React.useState(null);
  const [nuevo, setNuevo] = React.useState('');
  const [agregando, setAgregando] = React.useState(false);
  const [addError, setAddError] = React.useState(null);
  const [deletingId, setDeletingId] = React.useState(null);

  const cargar = React.useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/notificaciones');
      if (!res.ok) throw new Error('No se pudo cargar la lista');
      const data = await res.json();
      setEmails(data.emails);
    } catch (err) {
      setLoadError(err.message);
    }
  }, []);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  async function agregar() {
    if (!nuevo.trim()) return;
    setAgregando(true);
    setAddError(null);
    try {
      const res = await fetch('/api/admin/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nuevo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo agregar');
      setEmails((es) => [...(es || []), data.email].sort((a, b) => a.email.localeCompare(b.email)));
      setNuevo('');
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAgregando(false);
    }
  }

  async function sacar(item) {
    if (!window.confirm(`¿Sacar a "${item.email}" de la lista? Deja de recibir avisos de tickets nuevos y respuestas del cliente.`)) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`/api/admin/notificaciones/${item.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo sacar');
      setEmails((es) => es.filter((e) => e.id !== item.id));
    } catch (err) {
      window.alert(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card pad="none">
        <SectionBanner icon="message">Notificaciones</SectionBanner>

        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Estas direcciones reciben un email cada vez que se crea un ticket nuevo, y
            cada vez que un cliente responde en el chat de un ticket. Podés agregar o
            sacar gente cuando quieras, sin tocar nada más.
          </div>

          {loadError ? (
            <div style={{ color: 'var(--samply-red)', fontSize: 13, marginBottom: 16 }}>
              {loadError} — <button onClick={cargar} style={{ color: 'var(--samply-blue)', border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline' }}>reintentar</button>
            </div>
          ) : emails === null ? (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Cargando...</div>
          ) : emails.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--samply-amber)', marginBottom: 16, padding: '10px 12px', background: '#FFF7E6', borderRadius: 'var(--radius-sm)' }}>
              Todavía no hay nadie en la lista — si tenés configurada la variable
              <code> ADMIN_NOTIFICATION_EMAIL</code> en Netlify, esa se sigue usando
              mientras esta lista esté vacía. En cuanto agregues el primer email acá,
              esta lista pasa a mandar sola.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {emails.map((e) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{e.email}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Agregado {formatFecha(e.created_at)}</div>
                  </div>
                  <IconButton icon="x" tone="danger" size="sm" title="Sacar" onClick={() => sacar(e)} disabled={deletingId === e.id} />
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Agregar destinatario</div>
            {addError && (
              <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--samply-red-50)', color: 'var(--samply-red)', fontSize: 13 }}>
                {addError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Input type="email" placeholder="nombre@samply.com" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
              </div>
              <Button variant="primary" icon="plus" onClick={agregar} disabled={agregando || !nuevo.trim()}>
                {agregando ? 'Agregando...' : 'Agregar'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
