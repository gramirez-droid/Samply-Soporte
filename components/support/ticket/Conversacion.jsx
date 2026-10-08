'use client';
import React from 'react';
import { Icon } from '@/components/ds/Icon';
import { AudioRecorder, subirAudio } from '../AudioRecorder';
import { AudioMensaje } from '../AudioMensaje';
import { lineaDeTiempo, textoEvento, tipoArchivo, horaCorta } from './hilo';

const MAX_BYTES = 4.5 * 1024 * 1024;

function iniciales(nombre = '') {
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?';
}

function ArchivoEnMensaje({ url, nombre, mio }) {
  const tipo = tipoArchivo(nombre);
  if (tipo === 'imagen') {
    return (
      <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block' }} title={`Abrir ${nombre}`}>
        <img
          src={url}
          alt={nombre}
          loading="lazy"
          style={{ display: 'block', maxWidth: 260, maxHeight: 200, width: '100%', objectFit: 'cover', borderRadius: 8, background: '#EAF1FA' }}
        />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, textDecoration: 'none',
        background: mio ? 'rgba(255,255,255,0.15)' : '#F4F8FF', color: mio ? '#fff' : 'var(--text-primary)',
      }}
    >
      <Icon name="download" size={16} />
      <span style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{nombre}</span>
    </a>
  );
}

function Burbuja({ r, mio, mostrarAutor }) {
  const autor = r.agente_nombre || r.usuario_nombre || 'Alguien que ya no está en el sistema';
  const tieneArchivo = !!r.adjunto_url;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', alignSelf: mio ? 'flex-end' : 'flex-start', maxWidth: 'min(78%, 560px)' }}>
      {!mio && (
        <span
          aria-hidden
          style={{ flex: 'none', width: 30, height: 30, borderRadius: 999, background: r.agente_nombre ? 'var(--samply-blue)' : 'var(--samply-blue-100)', color: r.agente_nombre ? '#fff' : 'var(--text-primary)', fontSize: 11, fontWeight: 600, display: 'grid', placeItems: 'center' }}
        >
          {iniciales(autor)}
        </span>
      )}
      <div
        style={{
          minWidth: 0,
          padding: tieneArchivo && !r.mensaje && !r.audio_url ? 6 : '9px 13px',
          borderRadius: mio ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          background: mio ? 'var(--samply-blue)' : '#fff',
          border: mio ? 'none' : '1px solid var(--color-border)',
          color: mio ? '#fff' : 'var(--text-primary)',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}
      >
        {mostrarAutor && !mio && (
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--samply-blue)', padding: tieneArchivo && !r.mensaje && !r.audio_url ? '2px 4px 0' : 0 }}>{autor}</div>
        )}
        {r.audio_url && <AudioMensaje src={r.audio_url} duracion={r.audio_duracion_seg} sobreAzul={mio} />}
        {tieneArchivo && <ArchivoEnMensaje url={r.adjunto_url} nombre={r.adjunto_nombre || 'archivo'} mio={mio} />}
        {r.mensaje && <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{r.mensaje}</div>}
        <div style={{ fontSize: 11, textAlign: mio ? 'right' : 'left', color: mio ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)', padding: tieneArchivo && !r.mensaje && !r.audio_url ? '0 4px 2px' : 0 }}>
          {mio && mostrarAutor ? `${autor}, ` : ''}{horaCorta(r.created_at)}
        </div>
      </div>
    </div>
  );
}

function Evento({ children, fecha }) {
  return (
    <div
      style={{
        alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
        fontSize: 12, color: 'var(--text-secondary)', background: '#fff', border: '1px solid var(--color-border)',
        borderRadius: 999, padding: '4px 12px', textAlign: 'center',
      }}
    >
      <span>{children}</span>
      <span>{horaCorta(fecha)}</span>
    </div>
  );
}

/**
 * Hilo completo del ticket + compositor (texto, audio y archivo).
 * - vista: 'staff' | 'cliente' (de qué lado se pintan los mensajes propios)
 * - hilo: lo que devuelve useTicketHilo
 */
export function Conversacion({ ticket, hilo, apiBase, vista, textoCreado, placeholder, angosto }) {
  const [mensaje, setMensaje] = React.useState('');
  const [audio, setAudio] = React.useState(null);
  const [archivo, setArchivo] = React.useState(null); // { nombre, url }
  const [subiendoArchivo, setSubiendoArchivo] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState(null);
  const scrollRef = React.useRef(null);
  const fileRef = React.useRef(null);
  const uploadUrl = vista === 'staff' ? '/api/admin/upload' : '/api/upload';

  React.useEffect(() => { setMensaje(''); setAudio(null); setArchivo(null); setError(null); }, [ticket.dbId]);

  const items = hilo.cargando ? [] : lineaDeTiempo(ticket, hilo, textoCreado);

  // Siempre abajo de todo, como un chat, al abrir y cuando llega algo nuevo.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length, hilo.cargando]);

  const esMio = (r) => (vista === 'staff' ? !!r.agente_nombre : !!r.usuario_nombre && !r.agente_nombre);
  const hayAlgo = !!mensaje.trim() || !!audio || !!archivo;
  const ocupado = enviando || subiendoArchivo;

  async function elegirArchivo(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) { setError('El archivo pesa más de 4.5 MB.'); return; }
    setSubiendoArchivo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('carpeta', 'adjuntos');
      const res = await fetch(uploadUrl, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo subir el archivo');
      setArchivo({ nombre: data.nombre || file.name, url: data.url });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendoArchivo(false);
    }
  }

  async function enviar() {
    if (!hayAlgo || ocupado) return;
    setEnviando(true);
    setError(null);
    try {
      const audioSubido = audio ? await subirAudio(audio, uploadUrl) : null;
      const res = await fetch(`${apiBase}/${ticket.dbId}/respuestas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje, audio: audioSubido, adjunto: archivo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el mensaje');
      setMensaje('');
      setAudio(null);
      setArchivo(null);
      await hilo.recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function teclado(e) {
    // En la compu: Enter envía y Shift+Enter baja de línea.
    // En el celular Enter siempre baja de línea (se envía con el botón).
    if (e.key === 'Enter' && !e.shiftKey && !angosto && !e.nativeEvent.isComposing) {
      e.preventDefault();
      enviar();
    }
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--samply-bg)' }}>
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: angosto ? '14px 12px' : '20px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {hilo.cargando ? (
          <div style={{ margin: 'auto', fontSize: 13, color: 'var(--text-secondary)' }}>Cargando conversación…</div>
        ) : (
          items.map((it) => {
            if (it.tipo === 'creado') return <Evento key={it.key} fecha={it.fecha}>{it.texto}</Evento>;
            if (it.tipo === 'evento') {
              const { texto, valor } = textoEvento(it.h);
              return (
                <Evento key={it.key} fecha={it.fecha}>
                  {texto}{valor && <> <strong style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{valor}</strong></>}
                </Evento>
              );
            }
            return <Burbuja key={it.key} r={it.r} mio={esMio(it.r)} mostrarAutor={vista === 'staff' || !esMio(it.r)} />;
          })
        )}
        {!hilo.cargando && (hilo.respuestas || []).length === 0 && (
          <div style={{ alignSelf: 'center', marginTop: 8, fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 360 }}>
            {vista === 'staff' ? 'Todavía no hay mensajes. Escribile al cliente para arrancar.' : 'Todavía no hay respuestas. Te avisamos por mail apenas te escribamos.'}
          </div>
        )}
      </div>

      {/* Compositor */}
      <div style={{ borderTop: '1px solid var(--color-border)', background: '#fff', padding: angosto ? '10px 12px 14px' : '12px 20px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label htmlFor={`msg-${ticket.dbId}`} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{placeholder}</label>
        <textarea
          id={`msg-${ticket.dbId}`}
          rows={angosto ? 2 : 2}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          onKeyDown={teclado}
          placeholder={placeholder}
          disabled={enviando}
          style={{ fontFamily: 'var(--font-sans)', fontSize: angosto ? 16 : 14, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--samply-bg)', resize: 'none', color: 'var(--text-primary)', maxHeight: 160 }}
        />

        {archivo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--samply-blue-50)', fontSize: 13 }}>
            <Icon name="check" size={14} color="var(--samply-blue)" />
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{archivo.nombre}</span>
            <button type="button" onClick={() => setArchivo(null)} aria-label="Quitar archivo" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', width: 28, height: 28, display: 'grid', placeItems: 'center' }}>
              <Icon name="x" size={14} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <AudioRecorder value={audio} onChange={setAudio} disabled={enviando} />
            {!audio && (
              <>
                <button
                  type="button"
                  className="samply-audio-btn"
                  onClick={() => fileRef.current?.click()}
                  disabled={ocupado}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-strong)', background: '#fff', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                >
                  <Icon name="upload" size={15} /> {subiendoArchivo ? 'Subiendo…' : 'Adjuntar archivo'}
                </button>
                <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" onChange={elegirArchivo} style={{ display: 'none' }} />
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            {!angosto && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Enter envía, Shift+Enter baja de línea</span>}
            <button
              type="button"
              onClick={enviar}
              disabled={!hayAlgo || ocupado}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 18px', border: 'none', borderRadius: 'var(--radius-sm)',
                background: 'var(--samply-blue)', color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
                cursor: !hayAlgo || ocupado ? 'default' : 'pointer', opacity: !hayAlgo || ocupado ? 0.5 : 1,
              }}
            >
              {enviando ? (audio ? 'Subiendo audio…' : 'Enviando…') : 'Enviar'}
            </button>
          </div>
        </div>
        {error && <div style={{ fontSize: 12, color: 'var(--samply-red)' }}>{error}</div>}
      </div>
    </div>
  );
}
