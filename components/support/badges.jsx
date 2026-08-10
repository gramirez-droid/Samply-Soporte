'use client';
import React from 'react';
import { Badge } from '@/components/ds/Badge';
import { Icon } from '@/components/ds/Icon';
import { STATE_BADGE, PRIORITY_BADGE, slaTicket } from './constants';

export function stateBadge(v) {
  const [tone, variant] = STATE_BADGE[v] || ['neutral', 'soft'];
  return <Badge tone={tone} variant={variant}>{v}</Badge>;
}

export function priorityBadge(v) {
  const [tone, variant] = PRIORITY_BADGE[v] || ['neutral', 'soft'];
  return <Badge tone={tone} variant={variant}>{v}</Badge>;
}

const SLA_ETAPA_LABEL = {
  toma: { ok: 'En plazo (toma)', vencido: 'Sin tomar — vencido' },
  resolucion: { ok: 'En plazo (resolución)', vencido: 'Resolución vencida' },
  resuelto: { ok: 'Resuelto a tiempo', vencido: 'Resuelto fuera de plazo' },
};

/** Badge verde/roja según si el ticket está dentro del SLA (toma ≤ 1 día,
 *  resolución ≤ 7 días) o lo pasó — igual estando todavía abierto. */
export function slaBadge(ticket) {
  const sla = slaTicket(ticket);
  const labels = SLA_ETAPA_LABEL[sla.etapa];
  if (sla.cumplido) {
    return (
      <Badge tone="success" variant="soft">
        <Icon name="check-circle" size={12} />
        {labels.ok}
      </Badge>
    );
  }
  return (
    <Badge tone="danger" variant="solid">
      <Icon name="alert-circle" size={12} />
      {labels.vencido}
    </Badge>
  );
}
