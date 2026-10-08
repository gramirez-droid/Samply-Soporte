'use client';
import React from 'react';
import { Button } from '@/components/ds/Button';
import { formatFechaHora } from '@/components/support/constants';
import { AudioRecorder, subirAudio } from './AudioRecorder';
import { AudioMensaje } from './AudioMensaje';

/**
 * Hilo de conversación tipo chat, usado tanto en el panel de staff como en
 * el de cliente. `esMio(respuesta)` decide de qué lado se pinta cada
 * mensaje — desde el panel de staff, "mío" = lo escribió un agente; desde
 * el panel de cliente, "mío" = lo escribió alguien de su empresa.
 */
export function RespuestasChat({ apiBase, ticketId, esMio, placeholderVacio, placeholderEnviar, etiquetaBoton }) {
  const [respuestas, setRespuestas] = React.useState(null);
  const [mensaje, setMensaje] = React.useState('');
  const [audio, setAudio] = React.useState(null); // { archivo, urlLocal, duracion }
  // El staff sube por /api/admin/upload y el cliente por /api/upload.
  const uploadUrl = apiBase.startsWith('/api/admin') ? '/api/admin/upload' : '/api/upload';
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState(null);
  const bottomRef = React.useRef(null);

  const cargar = React.useCallback(() => {
    fetch(`${apiBase}/${ticketId}/respuestas`, { cache: 'no-store' })
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

  // Al cambiar de ticket se descarta lo que estaba a medio escribir/grabar.
  React.useEffect(() => { setMensaje(''); setAudio(null); setError(null); setRespuestas(null); }, [ticketId]);

  const hayAlgo = !!mensaje.trim() || !!audio;

  async function enviar() {
    if (!hayAlgo) return;
    setEnviando(true);
    setError(null);
    try {
      // 1) Si hay audio, primero se sube el archivo; 2) después va el mensaje.
      const audioSubido = audio ? await subirAudio(audio, uploadUrl) : null;
      const res = await fetch(`${apiBase}/${ticketId}/respuestas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje, audio: audioSubido }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el mensaje');
      setMensaje('');
      setAudio(null);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function nombreAutor(r) {
    return r.agente_nombre || r.usuario_nombre || 'Alguien que ya no está en el sistema';
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
                  {r.audio_url && (
                    <div style={{ marginBottom: r.mensaje ? 6 : 0 }}>
                      <AudioMensaje src={r.audio_url} duracion={r.audio_duracion_seg} sobreAzul={mio} />
                    </div>
                  )}
                  {r.mensaje && (
                    <div style={{ fontSize: 14, lineHeight: 'var(--lh-normal)', whiteSpace: 'pre-wrap' }}>{r.mensaje}</div>
                  )}
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <AudioRecorder value={audio} onChange={setAudio} disabled={enviando} />
          </div>
          <Button variant="primary" size="sm" icon="message" onClick={enviar} disabled={enviando || !hayAlgo}>
            {enviando ? (audio ? 'Subiendo audio...' : 'Enviando...') : etiquetaBoton}
          </Button>
        </div>
        {error && <div style={{ fontSize: 12, color: 'var(--samply-red)' }}>{error}</div>}
      </div>
    </div>
  );
}
