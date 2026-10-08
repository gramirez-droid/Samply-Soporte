// Lógica compartida del chat del ticket (panel de cliente y de staff):
// validación del contenido de un mensaje (texto y/o audio) y la forma en
// que se devuelve cada mensaje.

export const AUDIO_MAX_SEG = 180; // 3 minutos — igual que el límite del grabador

// Solo aceptamos archivos subidos a nuestro propio storage — no links externos.
const ES_URL_PROPIA = /^https?:\/\/[^\s]+\/api\/files\?key=[^\s]+$/i;

/** Columnas que devuelve cada mensaje del chat (mismo shape en los dos paneles). */
export const RESPUESTA_SELECT = `
  r.id, r.mensaje, r.audio_url, r.audio_duracion_seg, r.adjunto_url, r.adjunto_nombre, r.created_at,
  a.nombre AS agente_nombre, uc.nombre AS usuario_nombre
`;

/**
 * Valida el body de un mensaje nuevo. Acepta:
 *   { mensaje: "texto" }
 *   { audio: { url, duracion } }
 *   { mensaje: "texto", audio: { url, duracion } }
 * Devuelve { ok: true, mensaje, audioUrl, audioDuracion } o { ok: false, error }.
 */
export function validarContenidoRespuesta(body) {
  const mensaje = typeof body?.mensaje === 'string' ? body.mensaje.trim() : '';
  let audioUrl = null;
  let audioDuracion = null;

  if (body?.audio) {
    const url = typeof body.audio.url === 'string' ? body.audio.url.trim() : '';
    // Solo aceptamos audios subidos a nuestro propio storage — no links externos.
    if (!ES_URL_PROPIA.test(url)) {
      return { ok: false, error: 'El audio no es válido. Volvé a grabarlo.' };
    }
    const dur = Math.round(Number(body.audio.duracion));
    audioUrl = url;
    audioDuracion = Number.isFinite(dur) ? Math.min(Math.max(dur, 0), AUDIO_MAX_SEG + 5) : null;
  }

  let adjuntoUrl = null;
  let adjuntoNombre = null;
  if (body?.adjunto) {
    const url = typeof body.adjunto.url === 'string' ? body.adjunto.url.trim() : '';
    if (!ES_URL_PROPIA.test(url)) {
      return { ok: false, error: 'El archivo no es válido. Volvé a adjuntarlo.' };
    }
    adjuntoUrl = url;
    adjuntoNombre = String(body.adjunto.nombre || 'archivo').trim().slice(0, 255) || 'archivo';
  }

  if (!mensaje && !audioUrl && !adjuntoUrl) {
    return { ok: false, error: 'Escribí un mensaje, grabá un audio o adjuntá un archivo.' };
  }
  return { ok: true, mensaje: mensaje || null, audioUrl, audioDuracion, adjuntoUrl, adjuntoNombre };
}

export function formatDuracion(seg) {
  if (seg == null) return '';
  const s = Math.max(0, Math.round(seg));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Texto que va en el email de aviso cuando el mensaje trae audio. */
export function textoParaEmail(mensaje, audioDuracion, tieneAudio, adjuntoNombre) {
  const partes = [];
  if (mensaje) partes.push(mensaje);
  if (tieneAudio) {
    partes.push(`🎤 Mensaje de audio${audioDuracion != null ? ` (${formatDuracion(audioDuracion)})` : ''} — escuchalo en el panel.`);
  }
  if (adjuntoNombre) partes.push(`📎 Adjuntó un archivo: ${adjuntoNombre} — miralo en el panel.`);
  return partes.join('\n\n');
}
