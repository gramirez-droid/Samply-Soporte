'use client';
import React from 'react';
import { Icon } from '@/components/ds/Icon';
import { useAngosto, horaCorta } from './hilo';

/** Descripción fija del ticket: recortada, con "Ver todo" solo si hace falta. */
function DescripcionFija({ texto, etiqueta, lineas }) {
  const [abierta, setAbierta] = React.useState(false);
  const [desborda, setDesborda] = React.useState(false);
  const ref = React.useRef(null);
  const limpio = (texto || '').trim();
  const alto = Math.round(lineas * 14 * 1.5);

  React.useEffect(() => { setAbierta(false); }, [texto]);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (el) setDesborda(el.scrollHeight > alto + 2);
  }, [texto, alto]);

  return (
    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--samply-bg)', border: '1px solid var(--color-border)' }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 3 }}>{etiqueta}</div>
      {limpio ? (
        <>
          <div
            ref={ref}
            style={{
              fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: 'var(--text-primary)',
              ...(abierta ? { maxHeight: 280, overflowY: 'auto' } : { maxHeight: alto, overflow: 'hidden' }),
            }}
          >
            {limpio}
          </div>
          {desborda && (
            <button
              type="button"
              onClick={() => setAbierta((v) => !v)}
              style={{ marginTop: 4, padding: 0, minHeight: 24, border: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, color: 'var(--samply-blue)', cursor: 'pointer' }}
            >
              {abierta ? 'Ver menos' : 'Ver todo'}
            </button>
          )}
        </>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Sin descripción.</div>
      )}
    </div>
  );
}

/** Título chico de cada bloque de la columna lateral. */
export function Bloque({ titulo, extra, children }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h4 style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{titulo}</h4>
        {extra != null && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{extra}</span>}
      </div>
      {children}
    </section>
  );
}

/** Lista de archivos del ticket (imágenes, PDFs y audios). */
export function ArchivosLista({ archivos, onBorrar, borrandoId }) {
  if (!archivos) return <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cargando…</div>;
  if (archivos.length === 0) return <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Todavía no hay archivos.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {archivos.map((a) => (
        <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <a
            href={a.url}
            target="_blank"
            rel="noreferrer"
            style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: 7, borderRadius: 8, border: '1px solid var(--color-border)', textDecoration: 'none', color: 'var(--text-primary)' }}
          >
            <span style={{ flex: 'none', width: 36, height: 36, borderRadius: 4, background: '#EAF1FA', overflow: 'hidden', display: 'grid', placeItems: 'center', color: 'var(--samply-blue)' }}>
              {a.tipo === 'imagen' ? (
                <img src={a.url} alt="" loading="lazy" style={{ width: 36, height: 36, objectFit: 'cover' }} />
              ) : (
                <Icon name={a.tipo === 'audio' ? 'mic' : 'download'} size={16} />
              )}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.tipo === 'audio' && a.duracion != null ? `Audio, ${Math.floor(a.duracion / 60)}:${String(a.duracion % 60).padStart(2, '0')}` : a.nombre}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{[a.autor, horaCorta(a.fecha)].filter(Boolean).join(', ')}</span>
            </span>
          </a>
          {onBorrar && a.adjuntoId && (
            <button
              type="button"
              onClick={() => onBorrar(a.adjuntoId)}
              disabled={borrandoId === a.adjuntoId}
              aria-label={`Borrar ${a.nombre}`}
              title="Borrar archivo"
              style={{ flex: 'none', width: 32, height: 32, border: 'none', borderRadius: 4, background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
            >
              <Icon name="trash" size={15} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Detalle de ticket: encabezado (código, estado, asunto, datos y descripción
 * fija), conversación al centro y columna lateral. En el celular pasa a
 * pantalla completa con pestañas "Conversación" y "Detalles y archivos".
 */
export function TicketDetalle({ ticket, onClose, badges, meta, etiquetaDescripcion, conversacion, lateral }) {
  const angosto = useAngosto();
  const [pestana, setPestana] = React.useState('chat');
  const dialogRef = React.useRef(null);
  const downEnFondo = React.useRef(false);

  React.useEffect(() => { setPestana('chat'); }, [ticket.dbId]);

  // onClose cambia de referencia en cada render de la pantalla de atrás;
  // lo guardamos en un ref para que el efecto corra UNA sola vez al abrir
  // (si no, re-enfocaría el diálogo y te sacaría del cuadro de texto).
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  // Esc cierra; el fondo de la página no scrollea mientras está abierto.
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowPrevio;
    };
  }, []);

  const pestanaBtn = (id, texto) => (
    <button
      type="button"
      role="tab"
      aria-selected={pestana === id}
      onClick={() => setPestana(id)}
      style={{
        height: 44, border: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
        color: pestana === id ? 'var(--samply-blue)' : 'var(--text-secondary)',
        borderBottom: `2px solid ${pestana === id ? 'var(--samply-blue)' : 'transparent'}`,
      }}
    >
      {texto}
    </button>
  );

  return (
    <div
      onMouseDown={(e) => { downEnFondo.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (downEnFondo.current && e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(13,27,75,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: angosto ? 0 : 24 }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Ticket ${ticket.id}: ${ticket.asunto}`}
        tabIndex={-1}
        style={{
          width: '100%', maxWidth: angosto ? '100%' : 1180, height: angosto ? '100%' : 'min(820px, 100%)',
          background: '#fff', borderRadius: angosto ? 0 : 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', outline: 'none', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)',
        }}
      >
        {/* Encabezado */}
        <header style={{ padding: angosto ? '8px 14px 0' : '16px 24px 14px', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {angosto && (
              <button type="button" onClick={onClose} aria-label="Volver" style={{ width: 40, height: 40, marginLeft: -8, border: 'none', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                <Icon name="chevron-left" size={22} />
              </button>
            )}
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{ticket.id}</span>
            {badges}
            {!angosto && (
              <button type="button" onClick={onClose} aria-label="Cerrar" style={{ marginLeft: 'auto', width: 36, height: 36, border: 'none', borderRadius: 4, background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                <Icon name="x" size={20} />
              </button>
            )}
          </div>
          <h2 style={{ margin: 0, fontSize: angosto ? 18 : 22, fontWeight: 600, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{ticket.asunto}</h2>
          {meta && meta.length > 0 && (
            <div style={{ display: 'flex', gap: '4px 20px', flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' }}>
              {meta.map((m, i) => <span key={i}>{m}</span>)}
            </div>
          )}
          <DescripcionFija texto={ticket.desc} etiqueta={etiquetaDescripcion} lineas={angosto ? 2 : 3} />
          {angosto && (
            <div role="tablist" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              {pestanaBtn('chat', 'Conversación')}
              {pestanaBtn('detalles', 'Detalles y archivos')}
            </div>
          )}
        </header>

        {/* Cuerpo */}
        {angosto ? (
          pestana === 'chat' ? conversacion : (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>{lateral}</div>
          )
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>{conversacion}</div>
            <aside style={{ flex: 'none', width: 320, borderLeft: '1px solid var(--color-border)', overflowY: 'auto', padding: 20, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 22 }}>
              {lateral}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
