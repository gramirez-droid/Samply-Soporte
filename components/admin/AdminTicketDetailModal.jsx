'use client';
import React from 'react';
import { Modal } from '@/components/ds/Modal';
import { Button } from '@/components/ds/Button';
import { Select } from '@/components/ds/Select';
import { Input } from '@/components/ds/Input';
import { Icon } from '@/components/ds/Icon';
import { Badge } from '@/components/ds/Badge';
import {
  ESTADOS,
  PRIORIDADES,
  slaEstado,
  formatDuracion,
  formatFechaHora,
  TTO_LIMITE_HORAS,
  TTR_LIMITE_HORAS,
} from '@/components/support/constants';
import { RespuestasChat } from '@/components/support/RespuestasChat';

const CAMPO_LABEL = { estado: 'Estado', prioridad: 'Prioridad', agente: 'Agente asignado' };

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
  const [subiendo, setSubiendo] = React.useState(false);
  const fileInputRef = React.useRef(null);

  const cargar = React.useCallback(() => {
    fetch(`/api/admin/tickets/${ticketId}/adjuntos`)
      .then((res) => res.json())
      .then((data) => setAdjuntos(data.adjuntos || []))
      .catch(() => setAdjuntos([]));
  }, [ticketId]);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardarAdjunto(nombreArchivo, urlArchivo) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/adjuntos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombreArchivo, url: urlArchivo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo agregar el adjunto');
      cargar();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('carpeta', `tickets/${ticketId}`);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo subir el archivo');
      await guardarAdjunto(data.nombre, data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function agregar() {
    if (!nombre.trim() || !url.trim()) return;
    setGuardando(true);
    const ok = await guardarAdjunto(nombre, url);
    if (ok) {
      setNombre('');
      setUrl('');
    }
    setGuardando(false);
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
              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                — {a.usuario_nombre ? `${a.usuario_nombre} (cliente)` : a.agente_nombre || 'sin agente'}
              </span>
            </a>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/jpg,image/png"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
        <Button variant="secondary" size="sm" icon="download" onClick={() => fileInputRef.current?.click()} disabled={subiendo}>
          {subiendo ? 'Subiendo...' : 'Subir PDF o foto'}
        </Button>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>o</span>
        <Input placeholder="Nombre del archivo" value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ maxWidth: 160 }} />
        <Input placeholder="Pegar un link (Drive, etc.)" value={url} onChange={(e) => setUrl(e.target.value)} style={{ maxWidth: 220 }} />
        <Button variant="ghost" size="sm" onClick={agregar} disabled={guardando || !nombre.trim() || !url.trim()}>
          {guardando ? 'Agregando...' : 'Agregar link'}
        </Button>
      </div>
      {error && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--samply-red)' }}>{error}</div>}
    </div>
  );
}

function RespuestasTicket({ ticketId }) {
  return (
    <RespuestasChat
      apiBase="/api/admin/tickets"
      ticketId={ticketId}
      esMio={(r) => !!r.agente_nombre}
      placeholderVacio="Todavía no hay conversación en este ticket."
      placeholderEnviar="Escribí una respuesta — le va a llegar por email al cliente y va a quedar visible en su panel"
      etiquetaBoton="Enviar al cliente"
    />
  );
}

function AgentesTicket({ ticket, agentesDisponibles, onAgregar, onQuitar }) {
  const [agregando, setAgregando] = React.useState(false);
  const [quitandoId, setQuitandoId] = React.useState(null);
  const asignados = ticket.agentes || [];
  const idsAsignados = new Set(asignados.map((a) => a.id));
  const disponiblesParaAgregar = agentesDisponibles.filter((a) => !idsAsignados.has(a.id));

  async function agregar(e) {
    const agenteId = Number(e.target.value);
    if (!agenteId) return;
    setAgregando(true);
    await onAgregar(agenteId);
    setAgregando(false);
    e.target.value = '';
  }

  async function quitar(agenteId) {
    setQuitandoId(agenteId);
    await onQuitar(agenteId);
    setQuitandoId(null);
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
        Agentes asignados {asignados.length > 1 ? `(${asignados.length})` : ''}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, minHeight: 22 }}>
        {asignados.length === 0 ? (
          <Badge tone="neutral" variant="outline">Sin asignar</Badge>
        ) : (
          asignados.map((a) => (
            <Badge key={a.id} tone="info" variant="soft">
              {a.nombre}
              <button
                type="button"
                onClick={() => quitar(a.id)}
                disabled={quitandoId === a.id}
                title="Quitar de este ticket"
                style={{ background: 'none', border: 'none', padding: 0, marginLeft: 4, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
              >
                <Icon name="x" size={11} />
              </button>
            </Badge>
          ))
        )}
      </div>
      <Select
        placeholder={agregando ? 'Agregando...' : disponiblesParaAgregar.length ? 'Agregar agente...' : 'Ya están todos asignados'}
        options={disponiblesParaAgregar.map((a) => ({ value: String(a.id), label: a.nombre }))}
        value=""
        onChange={agregar}
        disabled={agregando || disponiblesParaAgregar.length === 0}
      />
    </div>
  );
}

export function AdminTicketDetailModal({ ticket, agentes, onClose, onUpdate, onAgregarAgente, onQuitarAgente }) {
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
          <div style={{ fontSize: 14, marginTop: 4 }}>
            {ticket.clienteNombre}
            {ticket.usuarioNombre && <span style={{ color: 'var(--text-secondary)' }}> — levantado por {ticket.usuarioNombre}</span>}
          </div>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
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
      </div>

      <div style={{ marginBottom: 16 }}>
        <AgentesTicket
          ticket={ticket}
          agentesDisponibles={agentes}
          onAgregar={(agenteId) => onAgregarAgente(ticket.dbId, agenteId)}
          onQuitar={(agenteId) => onQuitarAgente(ticket.dbId, agenteId)}
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

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
          Conversación con el cliente
        </div>
        <RespuestasTicket ticketId={ticket.dbId} />
      </div>

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
