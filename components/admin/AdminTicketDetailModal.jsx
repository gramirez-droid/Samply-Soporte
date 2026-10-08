'use client';
import React from 'react';
import { Select } from '@/components/ds/Select';
import { Icon } from '@/components/ds/Icon';
import { stateBadge, priorityBadge } from '@/components/support/badges';
import {
  ESTADOS, PRIORIDADES, slaEstado, formatDuracion, formatFechaHora, TTO_LIMITE_HORAS, TTR_LIMITE_HORAS,
} from '@/components/support/constants';
import { TicketDetalle, Bloque, ArchivosLista } from '@/components/support/ticket/TicketDetalle';
import { Conversacion } from '@/components/support/ticket/Conversacion';
import { useTicketHilo, archivosDelTicket, useAngosto } from '@/components/support/ticket/hilo';

/** Una fila de "Tiempos de atención": verde en término, rojo vencido, azul corriendo. */
function Tiempo({ titulo, sla, limiteHoras }) {
  let texto, fondo, color;
  if (!sla.cumplido) {
    texto = `${formatDuracion(sla.horas)}, vencido`; fondo = 'var(--samply-red-50)'; color = '#B3261E';
  } else if (sla.abierto) {
    texto = `${formatDuracion(sla.horas)} de ${limiteHoras === 24 ? '24h' : `${Math.round(limiteHoras / 24)} días`}`; fondo = 'var(--samply-blue-50)'; color = 'var(--samply-blue)';
  } else {
    texto = `${formatDuracion(sla.horas)}, en término`; fondo = 'var(--samply-green-50)'; color = '#1B7A43';
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span>{titulo}</span>
      <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 999, background: fondo, color }}>{texto}</span>
    </div>
  );
}

function Agentes({ ticket, agentesDisponibles, onAgregar, onQuitar }) {
  const [ocupado, setOcupado] = React.useState(null);
  const asignados = ticket.agentes || [];
  const ids = new Set(asignados.map((a) => a.id));
  const libres = agentesDisponibles.filter((a) => !ids.has(a.id));

  async function agregar(e) {
    const id = Number(e.target.value);
    if (!id) return;
    setOcupado('agregando');
    await onAgregar(id);
    setOcupado(null);
  }
  async function quitar(id) {
    setOcupado(id);
    await onQuitar(id);
    setOcupado(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {asignados.length === 0 && <span style={{ fontSize: 13, color: 'var(--samply-amber)', fontWeight: 500 }}>Sin asignar</span>}
        {asignados.map((a) => (
          <span key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px 3px 10px', borderRadius: 999, background: 'var(--samply-blue-50)', fontSize: 13 }}>
            {a.nombre}
            <button
              type="button"
              onClick={() => quitar(a.id)}
              disabled={ocupado === a.id}
              aria-label={`Quitar a ${a.nombre}`}
              title="Quitar de este ticket"
              style={{ width: 22, height: 22, border: 'none', borderRadius: 999, background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
            >
              <Icon name="x" size={12} />
            </button>
          </span>
        ))}
      </div>
      {libres.length > 0 && (
        <Select
          placeholder={ocupado === 'agregando' ? 'Asignando…' : 'Asignar a…'}
          options={libres.map((a) => ({ value: String(a.id), label: a.nombre }))}
          value=""
          onChange={agregar}
          disabled={ocupado === 'agregando'}
        />
      )}
    </div>
  );
}

function Contenido({ ticket, agentes, onClose, onUpdate, onAgregarAgente, onQuitarAgente }) {
  const angosto = useAngosto();
  const hilo = useTicketHilo('/api/admin/tickets', ticket.dbId);
  const [guardando, setGuardando] = React.useState(null);
  const [borrandoId, setBorrandoId] = React.useState(null);
  const archivos = hilo.cargando ? null : archivosDelTicket(hilo.adjuntos, hilo.respuestas);

  // Cada cambio del panel lateral queda en el hilo: por eso recargamos después.
  async function cambiar(campo, valor) {
    setGuardando(campo);
    await onUpdate(ticket.dbId, { [campo]: valor });
    setGuardando(null);
    hilo.recargar();
  }
  async function agregarAgente(id) { await onAgregarAgente(ticket.dbId, id); hilo.recargar(); }
  async function quitarAgente(id) { await onQuitarAgente(ticket.dbId, id); hilo.recargar(); }

  async function borrarArchivo(adjuntoId) {
    if (!confirm('¿Borrar este archivo del ticket? No se puede deshacer.')) return;
    setBorrandoId(adjuntoId);
    try {
      await fetch(`/api/admin/tickets/${ticket.dbId}/adjuntos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjuntoId }),
      });
      await hilo.recargar();
    } finally {
      setBorrandoId(null);
    }
  }

  const tto = slaEstado(ticket.fechaCreacionRaw, ticket.primeraRespuestaRaw, TTO_LIMITE_HORAS);
  const ttr = slaEstado(ticket.fechaCreacionRaw, ticket.resueltoRaw, TTR_LIMITE_HORAS);

  const lateral = (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        <Select
          label={guardando === 'estado' ? 'Estado (guardando…)' : 'Estado'}
          options={ESTADOS}
          value={ticket.estado}
          onChange={(e) => cambiar('estado', e.target.value)}
          disabled={guardando === 'estado'}
        />
        <Select
          label={guardando === 'prioridad' ? 'Prioridad (guardando…)' : 'Prioridad'}
          options={PRIORIDADES}
          value={ticket.prioridad}
          onChange={(e) => cambiar('prioridad', e.target.value)}
          disabled={guardando === 'prioridad'}
        />
      </div>

      <Bloque titulo="Agentes asignados">
        <Agentes ticket={ticket} agentesDisponibles={agentes} onAgregar={agregarAgente} onQuitar={quitarAgente} />
      </Bloque>

      <Bloque titulo="Tiempos de atención">
        <Tiempo titulo="Toma del ticket" sla={tto} limiteHoras={TTO_LIMITE_HORAS} />
        <Tiempo titulo="Resolución" sla={ttr} limiteHoras={TTR_LIMITE_HORAS} />
      </Bloque>

      <Bloque titulo="Archivos del ticket" extra={archivos ? archivos.length : null}>
        <ArchivosLista archivos={archivos} onBorrar={borrarArchivo} borrandoId={borrandoId} />
      </Bloque>

      {ticket.notionPageId && (
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          <Icon name="check" size={14} color="var(--samply-green)" />
          Sincronizado con Notion
        </div>
      )}
    </>
  );

  return (
    <TicketDetalle
      ticket={ticket}
      onClose={onClose}
      badges={<>{stateBadge(ticket.estado)}{priorityBadge(ticket.prioridad)}</>}
      meta={[
        <><strong style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ticket.clienteNombre}</strong>{ticket.usuarioNombre ? ` — levantado por ${ticket.usuarioNombre}` : ''}</>,
        formatFechaHora(ticket.fechaCreacionRaw),
        ticket.categoria,
        ticket.modulo,
      ]}
      etiquetaDescripcion="Descripción del cliente"
      conversacion={
        <Conversacion
          ticket={ticket}
          hilo={hilo}
          apiBase="/api/admin/tickets"
          vista="staff"
          textoCreado={`${ticket.usuarioNombre || ticket.clienteNombre} creó el ticket`}
          placeholder="Escribí una respuesta para el cliente…"
          angosto={angosto}
        />
      }
      lateral={lateral}
    />
  );
}

export function AdminTicketDetailModal({ ticket, agentes, onClose, onUpdate, onAgregarAgente, onQuitarAgente }) {
  if (!ticket) return null;
  return (
    <Contenido
      ticket={ticket}
      agentes={agentes || []}
      onClose={onClose}
      onUpdate={onUpdate}
      onAgregarAgente={onAgregarAgente}
      onQuitarAgente={onQuitarAgente}
    />
  );
}
