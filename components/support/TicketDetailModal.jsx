'use client';
import React from 'react';
import { Modal } from '@/components/ds/Modal';
import { Button } from '@/components/ds/Button';
import { AiInsight } from '@/components/ds/AiInsight';
import { Icon } from '@/components/ds/Icon';
import { stateBadge, priorityBadge } from './badges';
import { slaEstado, formatDuracion, formatFechaHora, TTO_LIMITE_HORAS, TTR_LIMITE_HORAS } from './constants';
import { RespuestasChat } from './RespuestasChat';

const CAMPO_LABEL = { estado: 'Estado', prioridad: 'Prioridad' };


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
    fetch(`/api/tickets/${ticketId}/historial`)
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

  if (error) {
    return <div style={{ fontSize: 13, color: 'var(--samply-red)' }}>{error}</div>;
  }
  if (historial === null) {
    return <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cargando historial...</div>;
  }
  if (historial.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Todavía no hubo cambios de estado ni de prioridad.</div>;
  }

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

function RespuestasTicket({ ticketId }) {
  return (
    <RespuestasChat
      apiBase="/api/tickets"
      ticketId={ticketId}
      esMio={(r) => !!r.usuario_nombre}
      placeholderVacio="Todavía no hay conversación en este ticket."
      placeholderEnviar="Escribí tu mensaje para el equipo de soporte..."
      etiquetaBoton="Enviar"
    />
  );
}

export function TicketDetailModal({ ticket, onClose }) {
  if (!ticket) return null;

  const rows = [
    ['Categoría', ticket.categoria],
    ['Módulo afectado', ticket.modulo],
    ['Prioridad', priorityBadge(ticket.prioridad)],
    ['Estado', stateBadge(ticket.estado)],
    ['Fecha', ticket.fecha],
  ];

  // SLA — TTO (toma, máx. 1 día) y TTR (resolución, máx. 7 días), estilo iTop.
  // Se muestran siempre, incluso si el ticket sigue abierto: si ya se pasó
  // el umbral sin resolver, se marca vencido igual (no espera a que se cierre).
  const slaTTO = slaEstado(ticket.fechaCreacionRaw, ticket.primeraRespuestaRaw, TTO_LIMITE_HORAS);
  const slaTTR = slaEstado(ticket.fechaCreacionRaw, ticket.resueltoRaw, TTR_LIMITE_HORAS);

  return (
    <Modal
      open={!!ticket}
      onClose={onClose}
      width={620}
      title={`Detalle de ticket · ${ticket.id}`}
      footer={<Button variant="ghost" onClick={onClose}>Cerrar</Button>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
        {rows.map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{k}</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 16, padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)' }}>
        <SlaMetric
          titulo="Toma de ticket"
          limiteHoras={TTO_LIMITE_HORAS}
          sla={slaTTO}
          etiquetaHecho={slaTTO.cumplido ? 'a tiempo' : 'fuera de plazo'}
          etiquetaEnCurso={slaTTO.cumplido ? 'todavía en plazo' : 'vencido, sin tomar'}
        />
        <SlaMetric
          titulo="Resolución"
          limiteHoras={TTR_LIMITE_HORAS}
          sla={slaTTR}
          etiquetaHecho={slaTTR.cumplido ? 'a tiempo' : 'fuera de plazo'}
          etiquetaEnCurso={slaTTR.cumplido ? 'todavía en plazo' : 'vencido, sin resolver'}
        />
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

      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
          Conversación con soporte
        </div>
        <RespuestasTicket ticketId={ticket.dbId} />
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
