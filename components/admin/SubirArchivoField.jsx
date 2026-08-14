'use client';
import React from 'react';
import { Button } from '@/components/ds/Button';
import { Input } from '@/components/ds/Input';

/**
 * Campo de "subir archivo" con fallback a URL manual — comparte la misma
 * UI en el modal de manuales y en los adjuntos de un ticket.
 * `onSubido(url, nombreOriginal)` se llama cuando termina un upload real;
 * `onUrlManual(url)` cuando el usuario prefiere pegar un link a mano.
 */
export function SubirArchivoField({ label, carpeta, accept, urlActual, onSubido, onUrlManual }) {
  const inputRef = React.useRef(null);
  const [subiendo, setSubiendo] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [mostrarUrlManual, setMostrarUrlManual] = React.useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('carpeta', carpeta);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo subir el archivo');
      onSubido(data.url, data.nombre);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>

      {urlActual && (
        <div style={{ marginBottom: 8, fontSize: 13 }}>
          <a href={urlActual} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--samply-blue)' }}>
            Ver archivo actual
          </a>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button variant="secondary" size="sm" icon="download" onClick={() => inputRef.current?.click()} disabled={subiendo}>
          {subiendo ? 'Subiendo...' : urlActual ? 'Reemplazar archivo' : 'Subir archivo'}
        </Button>
        <button
          type="button"
          onClick={() => setMostrarUrlManual((v) => !v)}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
        >
          o pegar un link
        </button>
      </div>

      {mostrarUrlManual && (
        <div style={{ marginTop: 8 }}>
          <Input
            placeholder="https://drive.google.com/..."
            value={urlActual && !urlActual.includes('/api/files?key=') ? urlActual : ''}
            onChange={(e) => onUrlManual(e.target.value)}
          />
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: 'var(--samply-red)', marginTop: 6 }}>{error}</div>}
    </div>
  );
}
