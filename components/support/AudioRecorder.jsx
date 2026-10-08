'use client';
import React from 'react';
import { Icon } from '@/components/ds/Icon';
import { AudioMensaje, formatDuracion } from './AudioMensaje';

export const AUDIO_MAX_SEG = 180; // 3 minutos (entra cómodo en el límite de 4.5 MB)

// Formatos en orden de preferencia: Chrome/Firefox/Edge graban webm u ogg,
// Safari (Mac y iPhone) graba mp4.
const FORMATOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
const EXT = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg' };

function formatoSoportado() {
  if (typeof MediaRecorder === 'undefined') return null;
  return FORMATOS.find((f) => MediaRecorder.isTypeSupported?.(f)) || '';
}

export function puedeGrabar() {
  return typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

/** Lee la duración de un archivo de audio subido (null si el navegador no la sabe). */
function leerDuracion(url) {
  return new Promise((resolve) => {
    const a = new Audio();
    a.preload = 'metadata';
    a.onloadedmetadata = () => resolve(Number.isFinite(a.duration) ? a.duration : null);
    a.onerror = () => resolve(null);
    a.src = url;
  });
}

/**
 * Sube el audio elegido/grabado al storage y devuelve { url, duracion }
 * listo para mandar a la API (mensaje del chat o alta de ticket).
 */
export async function subirAudio(audio, uploadUrl) {
  const formData = new FormData();
  formData.append('file', audio.archivo);
  formData.append('carpeta', 'audios');
  const res = await fetch(uploadUrl, { method: 'POST', body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo subir el audio');
  return { url: data.url, duracion: audio.duracion != null ? Math.round(audio.duracion) : null };
}

/**
 * Grabador de audio en tres estados: listo para grabar → grabando → escuchar
 * antes de mandar. También permite subir una nota de voz existente
 * (ej: un audio de WhatsApp).
 *
 * `value`: el audio actual ({ archivo, urlLocal, duracion }) o null.
 * `onChange(audio | null)`: se llama cuando hay audio listo o se descarta.
 */
export function AudioRecorder({ value, onChange, disabled = false }) {
  const [estado, setEstado] = React.useState('inactivo'); // inactivo | pidiendo | grabando
  const [segundos, setSegundos] = React.useState(0);
  const [error, setError] = React.useState(null);
  const [soportaGrabar, setSoportaGrabar] = React.useState(false);

  const recRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const chunksRef = React.useRef([]);
  const inicioRef = React.useRef(0);
  const timerRef = React.useRef(null);
  const cancelarRef = React.useRef(false);
  const fileRef = React.useRef(null);

  React.useEffect(() => { setSoportaGrabar(puedeGrabar()); }, []);

  const liberarMicrofono = React.useCallback(() => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Si el componente se desmonta (se cierra el modal) con el micrófono abierto, lo cerramos.
  React.useEffect(() => () => {
    cancelarRef.current = true;
    if (recRef.current?.state === 'recording') recRef.current.stop();
    liberarMicrofono();
  }, [liberarMicrofono]);

  // Liberamos la URL local del audio anterior cuando cambia o se descarta.
  React.useEffect(() => {
    const url = value?.urlLocal;
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [value?.urlLocal]);

  async function empezar() {
    setError(null);
    setEstado('pidiendo');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const tipo = formatoSoportado();
      const rec = tipo ? new MediaRecorder(stream, { mimeType: tipo, audioBitsPerSecond: 48000 }) : new MediaRecorder(stream);
      recRef.current = rec;
      chunksRef.current = [];
      cancelarRef.current = false;

      rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const duracion = (Date.now() - inicioRef.current) / 1000;
        liberarMicrofono();
        setEstado('inactivo');
        if (cancelarRef.current || chunksRef.current.length === 0) return;
        const mime = (rec.mimeType || tipo || 'audio/webm').split(';')[0];
        const blob = new Blob(chunksRef.current, { type: mime });
        const archivo = new File([blob], `audio-${Date.now()}.${EXT[mime] || 'webm'}`, { type: mime });
        onChange({ archivo, urlLocal: URL.createObjectURL(blob), duracion: Math.min(duracion, AUDIO_MAX_SEG) });
      };

      rec.start(1000);
      inicioRef.current = Date.now();
      setSegundos(0);
      setEstado('grabando');
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - inicioRef.current) / 1000);
        setSegundos(s);
        if (s >= AUDIO_MAX_SEG && rec.state === 'recording') rec.stop(); // corte automático a los 3 min
      }, 250);
    } catch (err) {
      liberarMicrofono();
      setEstado('inactivo');
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
        setError('El navegador bloqueó el micrófono. Habilitalo desde el candado de la barra de direcciones y probá de nuevo.');
      } else if (err?.name === 'NotFoundError') {
        setError('No encontramos ningún micrófono conectado.');
      } else {
        setError('No se pudo iniciar la grabación. Probá subir un audio en su lugar.');
      }
    }
  }

  function terminar() {
    if (recRef.current?.state === 'recording') recRef.current.stop();
  }

  function cancelar() {
    cancelarRef.current = true;
    terminar();
  }

  async function elegirArchivo(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    if (file.size > 4.5 * 1024 * 1024) {
      setError('El audio pesa más de 4.5 MB. Mandá uno más corto.');
      return;
    }
    const urlLocal = URL.createObjectURL(file);
    const duracion = await leerDuracion(urlLocal);
    onChange({ archivo: file, urlLocal, duracion });
  }

  const linkSubir = (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={disabled}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, color: 'var(--samply-blue)', textDecoration: 'underline' }}
      >
        {soportaGrabar ? 'o subir un audio' : 'Subir un audio'}
      </button>
      <input ref={fileRef} type="file" accept="audio/*,.opus,.ogg,.m4a" onChange={elegirArchivo} style={{ display: 'none' }} />
    </>
  );

  // --- Hay audio listo: se escucha antes de mandar ---
  if (value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: '#F1F5FB' }}>
        <div style={{ flex: 1 }}><AudioMensaje src={value.urlLocal} duracion={value.duracion} /></div>
        <button
          type="button"
          className="samply-audio-btn"
          onClick={() => onChange(null)}
          disabled={disabled}
          aria-label="Descartar audio"
          title="Descartar audio"
          style={{ flex: 'none', width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
        >
          <Icon name="trash" size={16} />
        </button>
      </div>
    );
  }

  // --- Grabando ---
  if (estado === 'grabando') {
    const restan = AUDIO_MAX_SEG - segundos;
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(229,57,53,0.08)' }}
      >
        <span className="samply-rec-dot" aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--samply-red)', flex: 'none' }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
          Grabando {formatDuracion(segundos)}
        </span>
        {restan <= 20 && (
          <span style={{ fontSize: 12, color: 'var(--samply-red)' }}>se corta en {restan}s</span>
        )}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={cancelar}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="samply-audio-btn"
          onClick={terminar}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', border: 'none', cursor: 'pointer',
            borderRadius: 'var(--radius-sm)', background: 'var(--samply-red)', color: '#fff', fontSize: 13, fontWeight: 600,
          }}
        >
          <Icon name="square" size={12} /> Terminar
        </button>
      </div>
    );
  }

  // --- Inactivo ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {soportaGrabar && (
          <button
            type="button"
            className="samply-audio-btn"
            onClick={empezar}
            disabled={disabled || estado === 'pidiendo'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', cursor: 'pointer',
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--samply-blue)', background: 'transparent',
              color: 'var(--samply-blue)', fontSize: 13, fontWeight: 500, opacity: disabled ? 0.5 : 1,
            }}
          >
            <Icon name="mic" size={15} /> {estado === 'pidiendo' ? 'Activando micrófono...' : 'Grabar audio'}
          </button>
        )}
        {linkSubir}
      </div>
      {error && <span style={{ fontSize: 12, color: 'var(--samply-red)' }}>{error}</span>}
    </div>
  );
}
