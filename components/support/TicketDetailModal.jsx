'use client';
import React from 'react';
import { stateBadge } from './badges';
import { slaEstado, formatDuracion, formatFechaHora, TTO_LIMITE_HORAS } from './constants';
import { TicketDetalle, Bloque, ArchivosLista } from './ticket/TicketDetalle';
import { Conversacion } from './ticket/Conversacion';
import { useTicketHilo, archivosDelTicket, useAngosto } from './ticket/hilo';

// Qué significa cada estado, contado para el cliente (no en jerga de soporte).
const ESTADO_CLIENTE = {
  'Nuevo': { titulo: 'Recibimos tu ticket', texto: 'En breve alguien del equipo lo va a tomar.', fondo: 'var(--samply-blue-50)' },
  'Asignado': { titulo: 'Tu ticket ya tiene responsable', texto: 'Lo vamos a revisar y te escribimos por acá.', fondo: 'var(--samply-blue-50)' },
  'En progreso': { titulo: 'Estamos trabajando en tu caso', texto: 'Te avisamos por mail cada vez que te respondamos.', fondo: 'var(--samply-blue-50)' },
  'Esperando cliente': { titulo: 'Necesitamos tu respuesta', texto: 'Respondé en la conversación para que podamos seguir.', fondo: 'var(--samply-amber-50)' },
  'Resuelto': { titulo: 'Lo dimos por resuelto', texto: 'Si algo sigue fallando, escribinos en la conversación.', fondo: 'var(--samply-green-50)' },
  'Cerrado': { titulo: 'Ticket cerrado', texto: 'Si el problema vuelve, creá un ticket nuevo.', fondo: 'var(--color-surface-2)' },
};

function Dato({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13 }}>{children}</div>
    </div>
  );
}

function Contenido({ ticket, onClose }) {
  const angosto = useAngosto();
  const hilo = useTicketHilo('/api/tickets', ticket.dbId);
  const archivos = hilo.cargando ? null : archivosDelTicket(hilo.adjuntos, hilo.respuestas);
  const estado = ESTADO_CLIENTE[ticket.estado] || ESTADO_CLIENTE['Nuevo'];
  const tto = slaEstado(ticket.fechaCreacionRaw, ticket.primeraRespuestaRaw, TTO_LIMITE_HORAS);
  const agentes = ticket.agentes || [];

  const lateral = (
    <>
      <div style={{ padding: 14, borderRadius: 8, background: estado.fondo }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{estado.titulo}</div>
        <div style={{ fontSize: 13, lineHeight: 1.45, marginTop: 4, color: 'var(--samply-navy-700)' }}>{estado.texto}</div>
      </div>

      <Bloque titulo="Te atiende">
        <div style={{ fontSize: 14 }}>{agentes.length ? agentes.map((a) => a.nombre).join(', ') : 'Todavía nadie, ya lo asignamos'}</div>
      </Bloque>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 10px' }}>
        <Dato label="Categoría">{ticket.categoria}</Dato>
        <Dato label="Módulo">{ticket.modulo}</Dato>
        <Dato label="Prioridad">{ticket.prioridad}</Dato>
        <Dato label="Primera respuesta">{ticket.primeraRespuestaRaw ? formatDuracion(tto.horas) : 'Pendiente'}</Dato>
      </div>

      <Bloque titulo="Archivos" extra={archivos ? archivos.length : null}>
        <ArchivosLista archivos={archivos} />
      </Bloque>
    </>
  );

  return (
    <TicketDetalle
      ticket={ticket}
      onClose={onClose}
      badges={stateBadge(ticket.estado)}
      meta={[`Creado el ${formatFechaHora(ticket.fechaCreacionRaw)}`]}
      etiquetaDescripcion="Tu descripción del problema"
      conversacion={
        <Conversacion
          ticket={ticket}
          hilo={hilo}
          apiBase="/api/tickets"
          vista="cliente"
          textoCreado="Se creó el ticket"
          placeholder="Escribile a soporte…"
          angosto={angosto}
        />
      }
      lateral={lateral}
    />
  );
}

export function TicketDetailModal({ ticket, onClose }) {
  if (!ticket) return null;
  return <Contenido ticket={ticket} onClose={onClose} />;
}
