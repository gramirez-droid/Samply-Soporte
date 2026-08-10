export const CATEGORIAS = ['Bug / error', 'Consulta funcional', 'Integración (ERP)', 'Facturación', 'Capacitación', 'Solicitud de mejora'];
export const MODULOS = ['App móvil (Preventa)', 'Televentas', 'B2B eCommerce', 'Inventarios', 'Facturación', 'Reportería / KPIs'];
export const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'];
export const ESTADOS = ['Nuevo', 'Asignado', 'En progreso', 'Esperando cliente', 'Resuelto', 'Cerrado'];

export const STATE_BADGE = {
  Nuevo: ['neutral', 'soft'],
  Asignado: ['info', 'soft'],
  'En progreso': ['info', 'solid'],
  'Esperando cliente': ['warning', 'soft'],
  Resuelto: ['success', 'solid'],
  Cerrado: ['neutral', 'outline'],
};

export const PRIORITY_BADGE = {
  Baja: ['neutral', 'soft'],
  Media: ['info', 'soft'],
  Alta: ['warning', 'soft'],
  Urgente: ['danger', 'solid'],
};

export function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** Horas transcurridas entre dos fechas ISO (null si falta alguna). */
export function horasEntre(desdeIso, hastaIso) {
  if (!desdeIso || !hastaIso) return null;
  const desde = new Date(desdeIso).getTime();
  const hasta = new Date(hastaIso).getTime();
  if (Number.isNaN(desde) || Number.isNaN(hasta)) return null;
  return Math.max(0, (hasta - desde) / (1000 * 60 * 60));
}

/** Formatea horas como "45 min" (si es menos de 1h) o "3.2h". */
export function formatDuracion(horas) {
  if (horas == null) return null;
  if (horas < 1) return `${Math.round(horas * 60)} min`;
  return `${horas.toFixed(1)}h`;
}

/** Promedio de TTO (primera respuesta) en horas sobre una lista de tickets
 *  ya mapeados. Devuelve null si ninguno tiene el dato todavía. */
export function promedioTTO(tickets) {
  const valores = tickets
    .map((t) => horasEntre(t.fechaCreacionRaw, t.primeraRespuestaRaw))
    .filter((h) => h != null);
  if (!valores.length) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

// Umbrales de SLA (definidos por Gonzalo): 1 día para tomar el ticket,
// 7 días para resolverlo.
export const TTO_LIMITE_HORAS = 24;
export const TTR_LIMITE_HORAS = 24 * 7;

/** Estado de cumplimiento de un SLA (TTO o TTR) para un ticket.
 *  - desdeIso: fecha de creación del ticket
 *  - marcaIso: fecha en que se alcanzó el hito (primera_respuesta_en /
 *    resuelto_en), o null si todavía no pasó — en ese caso se compara el
 *    tiempo transcurrido hasta AHORA contra el límite (para poder marcar
 *    "vencido" incluso en un ticket que sigue abierto, como hace iTop con
 *    sus estados de escalación).
 */
export function slaEstado(desdeIso, marcaIso, limiteHoras) {
  const hasta = marcaIso || new Date().toISOString();
  const horas = horasEntre(desdeIso, hasta);
  return {
    horas,
    cumplido: horas == null ? true : horas <= limiteHoras,
    abierto: !marcaIso,
  };
}

/** Estado de SLA combinado para mostrar en una sola badge en la tabla:
 *  - Resuelto/Cerrado -> evalúa el TTR contra la marca real de resolución.
 *  - Tomado pero no resuelto -> evalúa el TTR corriendo contra "ahora".
 *  - Todavía no tomado -> evalúa el TTO corriendo contra "ahora". */
export function slaTicket(t) {
  const finalizado = t.estado === 'Resuelto' || t.estado === 'Cerrado';
  if (finalizado) {
    return { ...slaEstado(t.fechaCreacionRaw, t.resueltoRaw, TTR_LIMITE_HORAS), etapa: 'resuelto' };
  }
  if (t.primeraRespuestaRaw) {
    return { ...slaEstado(t.fechaCreacionRaw, null, TTR_LIMITE_HORAS), etapa: 'resolucion' };
  }
  return { ...slaEstado(t.fechaCreacionRaw, null, TTO_LIMITE_HORAS), etapa: 'toma' };
}

/** % de tickets que están dentro del SLA (TTO o TTR según su etapa actual)
 *  sobre el total. Null si no hay tickets. */
export function porcentajeCumplimientoSLA(tickets) {
  if (!tickets.length) return null;
  const cumplen = tickets.filter((t) => slaTicket(t).cumplido).length;
  return Math.round((cumplen / tickets.length) * 100);
}

/** Mapea el ticket tal como viene de la API (campos en castellano de la DB)
 *  a la forma que espera la UI del prototipo. */
export function mapTicket(t) {
  return {
    dbId: t.id,
    id: t.codigo,
    asunto: t.asunto,
    desc: t.descripcion || '',
    categoria: t.categoria,
    modulo: t.modulo,
    prioridad: t.prioridad,
    estado: t.estado,
    fecha: formatFecha(t.fecha_creacion),
    ai: t.ai_resumen,
    notionPageId: t.notion_page_id,
    // Crudos en ISO, para calcular TTO/TTR sin tener que re-parsear el
    // formato de fecha ya localizado.
    fechaCreacionRaw: t.fecha_creacion,
    primeraRespuestaRaw: t.primera_respuesta_en,
    resueltoRaw: t.resuelto_en,
  };
}

/** Igual que mapTicket, pero para la vista de staff — incluye el nombre del
 *  cliente y el agente asignado (que vienen del JOIN en /api/admin/tickets). */
export function mapTicketAdmin(t) {
  return {
    ...mapTicket(t),
    clienteId: t.cliente_id,
    clienteNombre: t.cliente_nombre,
    agenteId: t.agente_id,
    agenteNombre: t.agente_nombre,
  };
}
