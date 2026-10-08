'use client';
import React from 'react';
import { Icon } from '@/components/ds/Icon';

export function formatDuracion(seg) {
  if (seg == null || !Number.isFinite(seg)) return '–:––';
  const s = Math.max(0, Math.round(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Reproductor compacto para un audio de la conversación.
 * Usa la duración guardada al grabar (`duracion`) porque los .webm que graba
 * Chrome no la traen en el archivo y el reproductor nativo muestra "Infinity".
 * `sobreAzul`: true cuando va dentro de una burbuja azul (mensaje propio).
 */
export function AudioMensaje({ src, duracion, sobreAzul = false }) {
  const audioRef = React.useRef(null);
  const [reproduciendo, setReproduciendo] = React.useState(false);
  const [actual, setActual] = React.useState(0);
  const [durReal, setDurReal] = React.useState(null);
  const [error, setError] = React.useState(false);

  const total = Number.isFinite(durReal) && durReal > 0 ? durReal : duracion;
  const progreso = total ? Math.min(actual / total, 1) : 0;

  const colorBase = sobreAzul ? '#fff' : 'var(--samply-blue)';
  const colorPista = sobreAzul ? 'rgba(255,255,255,0.35)' : 'rgba(21,101,192,0.18)';
  const colorTexto = sobreAzul ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)';

  async function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      try {
        await a.play();
      } catch {
        setError(true);
      }
    } else {
      a.pause();
    }
  }

  function saltar(clientX, el) {
    const a = audioRef.current;
    if (!a || !total) return;
    const r = el.getBoundingClientRect();
    const frac = Math.min(Math.max((clientX - r.left) / r.width, 0), 1);
    a.currentTime = frac * total;
    setActual(a.currentTime);
  }

  function teclado(e) {
    const a = audioRef.current;
    if (!a || !total) return;
    if (e.key === 'ArrowRight') { a.currentTime = Math.min(a.currentTime + 5, total); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { a.currentTime = Math.max(a.currentTime - 5, 0); e.preventDefault(); }
  }

  if (error) {
    return (
      <a href={src} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: colorBase, textDecoration: 'underline' }}>
        Este navegador no reproduce el audio — descargalo acá
      </a>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 220, maxWidth: 320 }}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setReproduciendo(true)}
        onPause={() => setReproduciendo(false)}
        onEnded={() => { setReproduciendo(false); setActual(0); }}
        onTimeUpdate={(e) => setActual(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDurReal(e.currentTarget.duration)}
        onError={() => setError(true)}
      />
      <button
        type="button"
        className="samply-audio-btn"
        onClick={toggle}
        aria-label={reproduciendo ? 'Pausar audio' : 'Reproducir audio'}
        style={{
          flex: 'none', width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer',
          display: 'grid', placeItems: 'center',
          background: sobreAzul ? '#fff' : 'var(--samply-blue)',
          color: sobreAzul ? 'var(--samply-blue)' : '#fff',
        }}
      >
        <Icon name={reproduciendo ? 'pause' : 'play'} size={15} />
      </button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div
          className="samply-audio-track"
          role="slider"
          tabIndex={0}
          aria-label="Posición del audio"
          aria-valuemin={0}
          aria-valuemax={Math.round(total || 0)}
          aria-valuenow={Math.round(actual)}
          onClick={(e) => saltar(e.clientX, e.currentTarget)}
          onKeyDown={teclado}
          style={{ position: 'relative', height: 6, borderRadius: 3, background: colorPista }}
        >
          <div style={{ position: 'absolute', inset: 0, width: `${progreso * 100}%`, borderRadius: 3, background: colorBase }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colorTexto, fontVariantNumeric: 'tabular-nums' }}>
          <span>{reproduciendo || actual > 0 ? formatDuracion(actual) : 'Audio'}</span>
          <span>{formatDuracion(total)}</span>
        </div>
      </div>
    </div>
  );
}
