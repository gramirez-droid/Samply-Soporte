'use client';
import React from 'react';
import { Modal } from '@/components/ds/Modal';
import { Button } from '@/components/ds/Button';
import { Select } from '@/components/ds/Select';
import { Input } from '@/components/ds/Input';
import { AiInsight } from '@/components/ds/AiInsight';
import { Icon } from '@/components/ds/Icon';
import { Badge } from '@/components/ds/Badge';
import {
  ESTADOS,
  PRIORIDADES,
  slaEstado,
  formatDuracion,
  TTO_LIMITE_HORAS,
  TTR_LIMITE_HORAS,
} from '@/components/support/constants';

const CAMPO_LABEL = { estado: 'Estado', prioridad: 'Prioridad', agente: 'Agente asignado' };

function formatFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function SlaMetric({ titulo, limiteHoras, sla, etiquetaHecho, etiquetaEnCurso }) {
  const color = sla.cumplido ? 'var(--samply-green)' : 'var(--samply-red)';
  const texto = sla.abierto
    ? `${formatDuracion(sla.horas)} transcurridas — ${etiquetaEnCurso}`
    : `${formatDuracion(sla.horas)} — ${etiquetaHecho}`;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
        {titulo} <span style={{ fontWeight: 400 }}>(máx. {limiteHoras === 24 ? '1 día' : `${Math.round(limiteHoras / 24)} días`})</span>
      </div>
      <div style={{ fontSize: 14, marginTop: 2, color, fontWeight: 600 }}>{texto}</div>
    </div>
  );
}

function HistorialTicket({ ticketId }) {
  const [historial, setHistorial] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelado = false;
    setHistorial(null);
    setError(null);
    fetch(`/api/admin/tickets/${ticketId}/historial`)
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar el historial');
        return res.json();
      })
      .then((data) => {
        if (!cancelado) setHistorial(data.historial);
      })
      .catch((err) => {
        if (!cancelado) setError(err.message);
      });
    return () => {
      cancelado = true;
    };
  }, [ticketId]);

  if (error) return <div style={{ fontSize: 13, color: 'var(--samply-red)' }}>{error}</div>;
  if (historial === null) return <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cargando historial...</div>;
  if (historial.length === 0) return <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Todavía no hubo cambios.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {historial.map((h) => (
        <div key={h.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
          <Icon name="clock" size={14} color="var(--text-secondary)" style={{ marginTop: 2 }} />
          <div>
            <strong>{CAMPO_LABEL[h.campo] || h.campo}</strong>{' '}
            {h.valor_anterior ? <>cambió de <strong>{h.valor_anterior}</strong> a</> : 'se estableció en'}{' '}
            <strong>{h.valor_nuevo}</strong>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{formatFechaHora(h.changed_at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdjuntosTicket({ ticketId }) {
  const [adjuntos, setAdjuntos] = React.useState(null);
  const [nombre, setNombre] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [error, setError] = React.useState(null);
  const [guardando, setGuardando] = React.useState(false);

  const cargar = React.useCallback(() => {
    fetch(`/api/admin/tickets/${ticketId}/adjuntos`)
      .then((res) => res.json())
      .then((data) => setAdjuntos(data.adjuntos || []))
      .catch(() => setAdjuntos([]));
  }, [ticketId]);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  async function agregar() {
    if (!nombre.trim() || !url.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/adjuntos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo agregar el adjunto');
      setNombre('');
      setUrl('');
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      {adjuntos === null ? (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cargando adjuntos...</div>
      ) : adjuntos.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>Sin adjuntos todavía.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {adjuntos.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--samply-blue)' }}
            >
              <Icon name="download" size={14} />
              {a.nombre}
              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>— {a.agente_nombre || 'sin agente'}</span>
            </a>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
        <Input placeholder="Nombre del archivo" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Input placeholder="URL (Drive, etc.)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button variant="secondary" size="sm" onClick={agregar} disabled={guardando || !nombre.trim() || !url.trim()}>
          {guardando ? 'Agregando...' : 'Agregar'}
        </Button>
      </div>
      {error && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--samply-red)' }}>{error}</div>}
      <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
        Por ahora son links (Drive, etc.), no upload de archivo real — todavía no hay storage configurado.
      </div>
    </div>
  );
}

export function AdminTicketDetailModal({ ticket, agentes, onClose, onUpdate }) {
  const [saving, setSaving] = React.useState(null); // qué campo se está guardando

  if (!ticket) return null;

  async function cambiar(campo, valor) {
    setSaving(campo);
    await onUpdate(ticket.dbId, { [campo]: valor });
    setSaving(null);
  }

  const slaTTO = slaEstado(ticket.fechaCreacionRaw, ticket.primeraRespuestaRaw, TTO_LIMITE_HORAS);
  const slaTTR = slaEstado(ticket.fechaCreacionRaw, ticket.resueltoRaw, TTR_LIMITE_HORAS);

  return (
    <Modal
      open={!!ticket}
      onClose={onClose}
      width={680}
      title={`Detalle de ticket · ${ticket.id}`}
      footer={<Button variant="ghost" onClick={onClose}>Cerrar</Button>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Cliente</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{ticket.clienteNombre}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Fecha</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{ticket.fecha}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Categoría</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{ticket.categoria}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Módulo afectado</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>{ticket.modulo}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <Select
          label={`Estado ${saving === 'estado' ? '(guardando...)' : ''}`}
          options={ESTADOS}
          value={ticket.estado}
          onChange={(e) => cambiar('estado', e.target.value)}
          disabled={saving === 'estado'}
        />
        <Select
          label={`Prioridad ${saving === 'prioridad' ? '(guardando...)' : ''}`}
          options={PRIORIDADES}
          value={ticket.prioridad}
          onChange={(e) => cambiar('prioridad', e.target.value)}
          disabled={saving === 'prioridad'}
        />
        <Select
          label={`Agente asignado ${saving === 'agenteId' ? '(guardando...)' : ''}`}
          placeholder="Sin asignar"
          options={agentes.map((a) => ({ value: String(a.id), label: a.nombre }))}
          value={ticket.agenteId ? String(ticket.agenteId) : ''}
          onChange={(e) => cambiar('agenteId', e.target.value ? Number(e.target.value) : null)}
          disabled={saving === 'agenteId'}
        />
      </div>

      {ticket.notionPageId && (
        <div style={{ marginBottom: 16 }}>
          <Badge tone="ai" variant="soft">
            <Icon name="check-circle" size={12} /> Sincronizado con Notion
          </Badge>
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, marginBottom: 16, padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)' }}>
        <SlaMetric titulo="Toma de ticket" limiteHoras={TTO_LIMITE_HORAS} sla={slaTTO}
          etiquetaHecho={slaTTO.cumplido ? 'a tiempo' : 'fuera de plazo'}
          etiquetaEnCurso={slaTTO.cumplido ? 'todavía en plazo' : 'vencido, sin tomar'} />
        <SlaMetric titulo="Resolución" limiteHoras={TTR_LIMITE_HORAS} sla={slaTTR}
          etiquetaHecho={slaTTR.cumplido ? 'a tiempo' : 'fuera de plazo'}
          etiquetaEnCurso={slaTTR.cumplido ? 'todavía en plazo' : 'vencido, sin resolver'} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 4 }}>
          Descripción del cliente
        </div>
        <div style={{ fontSize: 14, lineHeight: 'var(--lh-normal)' }}>{ticket.desc || 'Sin descripción.'}</div>
      </div>

      {ticket.ai ? (
        <AiInsight agent="Soporte" title="Resumen del análisis">{ticket.ai}</AiInsight>
      ) : (
        <AiInsight icon="sparkles" title="Análisis pendiente">
          Este ticket todavía no fue analizado por IA — eso se activa en la Fase 2.
        </AiInsight>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
          Adjuntos
        </div>
        <AdjuntosTicket ticketId={ticket.dbId} />
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
          Historial de cambios
        </div>
        <HistorialTicket ticketId={ticket.dbId} />
      </div>
    </Modal>
  );
}
