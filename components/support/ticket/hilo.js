'use client';
import React from 'react';

/**
 * Carga todo lo que pasó en un ticket (mensajes, cambios de estado y
 * archivos) en una sola pasada. Lo usan la conversación y la columna lateral,
 * así no se pide lo mismo dos veces.
 * apiBase: '/api/tickets' (cliente) o '/api/admin/tickets' (staff).
 */
export function useTicketHilo(apiBase, ticketId) {
  const [datos, setDatos] = React.useState({ respuestas: null, historial: null, adjuntos: null });
  const pedido = React.useRef(0);

  const recargar = React.useCallback(async () => {
    const n = ++pedido.current;
    const traer = (ruta, clave) =>
      fetch(`${apiBase}/${ticketId}/${ruta}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : {}))
        .then((d) => d[clave] || [])
        .catch(() => []);
    const [respuestas, historial, adjuntos] = await Promise.all([
      traer('respuestas', 'respuestas'),
      traer('historial', 'historial'),
      traer('adjuntos', 'adjuntos'),
    ]);
    if (n === pedido.current) setDatos({ respuestas, historial, adjuntos });
  }, [apiBase, ticketId]);

  React.useEffect(() => {
    setDatos({ respuestas: null, historial: null, adjuntos: null });
    recargar();
  }, [recargar]);

  const cargando = datos.respuestas === null;
  return { ...datos, cargando, recargar };
}

const EXT_IMAGEN = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const EXT_AUDIO = ['webm', 'ogg', 'opus', 'm4a', 'mp3', 'wav', 'aac'];

export function tipoArchivo(nombre = '') {
  const ext = nombre.split('.').pop().toLowerCase();
  if (EXT_IMAGEN.includes(ext)) return 'imagen';
  if (ext === 'pdf') return 'pdf';
  if (EXT_AUDIO.includes(ext)) return 'audio';
  return 'archivo';
}

function autorDe(x) {
  return x.agente_nombre || x.usuario_nombre || null;
}

/** Todos los archivos del ticket (los del alta, los del chat y los audios), por fecha. */
export function archivosDelTicket(adjuntos, respuestas) {
  const lista = [];
  for (const a of adjuntos || []) {
    lista.push({ key: `a${a.id}`, nombre: a.nombre, url: a.url, autor: autorDe(a), fecha: a.created_at, tipo: tipoArchivo(a.nombre), adjuntoId: a.id });
  }
  for (const r of respuestas || []) {
    if (r.adjunto_url) {
      lista.push({ key: `r${r.id}`, nombre: r.adjunto_nombre || 'archivo', url: r.adjunto_url, autor: autorDe(r), fecha: r.created_at, tipo: tipoArchivo(r.adjunto_nombre) });
    }
    if (r.audio_url) {
      lista.push({ key: `au${r.id}`, nombre: 'Audio', url: r.audio_url, autor: autorDe(r), fecha: r.created_at, tipo: 'audio', duracion: r.audio_duracion_seg });
    }
  }
  return lista.sort((x, y) => new Date(x.fecha) - new Date(y.fecha));
}

/** Texto de un cambio del historial, dentro del hilo. */
export function textoEvento(h) {
  const autor = h.autor_nombre;
  const nuevo = h.valor_nuevo || '';
  if (h.campo === 'estado') {
    if (nuevo.startsWith('Cerrado (automático)')) return { texto: 'El ticket se cerró automáticamente', valor: null };
    if (nuevo.includes('(vía Notion)')) return { texto: 'Se marcó como resuelto desde Notion', valor: null };
    if (nuevo.includes('(respondió el cliente)')) return { texto: 'Volvió a En progreso porque respondió el cliente', valor: null };
    return { texto: autor ? `${autor} cambió el estado a` : 'El estado cambió a', valor: nuevo };
  }
  if (h.campo === 'prioridad') {
    return { texto: autor ? `${autor} cambió la prioridad a` : 'La prioridad cambió a', valor: nuevo };
  }
  if (h.campo === 'agente') {
    if (nuevo === 'Quitado') return { texto: autor ? `${autor} quitó del ticket a` : 'Se quitó del ticket a', valor: h.valor_anterior };
    return { texto: autor ? `${autor} asignó a` : 'Se asignó a', valor: nuevo };
  }
  return { texto: `${h.campo}:`, valor: nuevo };
}

/** Todo lo que pasó, en orden: alta del ticket, mensajes, archivos del alta y cambios. */
export function lineaDeTiempo(ticket, { respuestas, historial, adjuntos }, textoCreado) {
  const items = [{ key: 'creado', tipo: 'creado', fecha: ticket.fechaCreacionRaw, texto: textoCreado }];
  for (const r of respuestas || []) items.push({ key: `m${r.id}`, tipo: 'mensaje', fecha: r.created_at, r });
  // Archivos sueltos (los del alta del ticket o los que se cargaban por link)
  // se muestran como un mensaje con el archivo, de quien lo subió.
  for (const a of adjuntos || []) {
    items.push({
      key: `a${a.id}`, tipo: 'mensaje', fecha: a.created_at,
      r: { id: `a${a.id}`, mensaje: null, adjunto_url: a.url, adjunto_nombre: a.nombre, agente_nombre: a.agente_nombre, usuario_nombre: a.usuario_nombre, created_at: a.created_at },
    });
  }
  for (const h of historial || []) items.push({ key: `h${h.id}`, tipo: 'evento', fecha: h.changed_at, h });
  return items.sort((x, y) => new Date(x.fecha) - new Date(y.fecha));
}

export function horaCorta(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hoy = new Date();
  const mismoDia = d.toDateString() === hoy.toDateString();
  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return mismoDia ? hora : `${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}, ${hora}`;
}

/** true en pantallas angostas (celular): el detalle pasa a pestañas. */
export function useAngosto(px = 760) {
  const [angosto, setAngosto] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${px}px)`);
    const fn = () => setAngosto(mq.matches);
    fn();
    mq.addEventListener?.('change', fn);
    return () => mq.removeEventListener?.('change', fn);
  }, [px]);
  return angosto;
}
