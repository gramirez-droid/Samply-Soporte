'use client';
import React from 'react';
import { Button } from '@/components/ds/Button';
import { formatFechaHora } from '@/components/support/constants';

/**
 * Hilo de conversación tipo chat, usado tanto en el panel de staff como en
 * el de cliente. `esMio(respuesta)` decide de qué lado se pinta cada
 * mensaje — desde el panel de staff, "mío" = lo escribió un agente; desde
 * el panel de cliente, "mío" = lo escribió alguien de su empresa.
 */
export function RespuestasChat({ apiBase, ticketId, esMio, placeholderVacio, placeholderEnviar, etiquetaBoton }) {
  const [respuestas, setRespuestas] = React.useState(null);
  const [mensaje, setMensaje] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState(null);
  const bottomRef = React.useRef(null);

  const cargar = React.useCallback(() => {
    fetch(`${apiBase}/${ticketId}/respuestas`)
      .then((res) => (res.ok ? res.json() : { respuestas: [] }))
      .then((data) => setRespuestas(data.respuestas || []))
      .catch(() => setRespuestas([]));
  }, [apiBase, ticketId]);

  React.useEffect(() => {
    cargar();
  }, [cargar]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [respuestas]);

  async function enviar() {
    if (!mensaje.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/${ticketId}/respuestas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el mensaje');
      setMensaje('');
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function nombreAutor(r) {
    return r.agente_nombre || r.usuario_nombre || 'Alguien';
  }

  return (
    <div>
      {respuestas === null ? (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cargando conversación...</div>
      ) : respuestas.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>{placeholderVacio}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: 260, overflowY: 'auto', padding: '2px 2px' }}>
          {respuestas.map((r) => {
            const mio = esMio(r);
            return (
              <div key={r.id} style={{ display: 'flex', justifyContent: mio ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: mio ? 'var(--samply-blue)' : 'var(--color-surface-2)',
                    color: mio ? '#fff' : 'var(--text-primary)',
                  }}
                >
                  <div style={{ fontSize: 14, lineHeight: 'var(--lh-normal)', whiteSpace: 'pre-wrap' }}>{r.mensaje}</div>
                  <div style={{ fontSize: 11, marginTop: 4, color: mio ? 'rgba(255,255,255,0.75)' : 'var(--text-secondary)' }}>
                    {nombreAutor(r)} — {formatFechaHora(r.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <textarea
          rows={2}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder={placeholderEnviar}
          style={{ fontFamily: 'var(--font-sans)', fontSize: 14, padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid transparent', background: '#F1F5FB', resize: 'vertical', color: 'var(--text-primary)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" size="sm" icon="message" onClick={enviar} disabled={enviando || !mensaje.trim()}>
            {enviando ? 'Enviando...' : etiquetaBoton}
          </Button>
        </div>
        {error && <div style={{ fontSize: 12, color: 'var(--samply-red)' }}>{error}</div>}
      </div>
    </div>
  );
}
