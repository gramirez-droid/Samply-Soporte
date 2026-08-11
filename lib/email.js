// Envío de emails con Resend (recomendado para Vercel — sin servidor SMTP
// propio, plan gratis alcanza de sobra para esto). Mientras no tengas
// RESEND_API_KEY configurada, esto NO falla: loguea el email a consola en
// vez de mandarlo, así podés seguir probando el resto del flujo sin la
// credencial. Apenas la sumes a .env, empieza a mandar de verdad.

let resendClient = null;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) {
    // Import diferido: si no hay API key no hace falta ni cargar el paquete.
    const { Resend } = require('resend');
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/**
 * Envía un email, o lo loguea a consola si no hay RESEND_API_KEY todavía.
 * Nunca throwea — un email que falla no debe tirar abajo la creación de un
 * ticket. Devuelve { enviado: boolean, motivo?: string }.
 */
export async function enviarEmail({ to, subject, html }) {
  const from = process.env.EMAIL_FROM || 'Samply Soporte <soporte@samply.com>';
  const resend = getResend();

  if (!resend) {
    console.log('[email] RESEND_API_KEY no configurada — simulando envío:');
    console.log(`  Para: ${to}`);
    console.log(`  Asunto: ${subject}`);
    console.log(`  ---`);
    console.log(`  ${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`);
    return { enviado: false, motivo: 'RESEND_API_KEY no configurada (simulado en consola)' };
  }

  try {
    await resend.emails.send({ from, to, subject, html });
    return { enviado: true };
  } catch (err) {
    console.error('[email] Error enviando email:', err.message);
    return { enviado: false, motivo: err.message };
  }
}

// ---------------------------------------------------------------------------
// Plantilla visual compartida — paleta e identidad de Samply (navy/blue,
// mismos colores que el design system del panel). Usamos texto estilizado
// para el wordmark en vez de una imagen: así se ve bien incluso en clientes
// de correo que bloquean imágenes por default (Gmail, Outlook corporativo).
// ---------------------------------------------------------------------------

const SAMPLY_NAVY = '#0D1B4B';
const SAMPLY_BLUE = '#1565C0';
const SAMPLY_SKY = '#6DA8DA';
const SAMPLY_BG = '#F4F8FF';
const SAMPLY_GREEN = '#27AE60';

function emailLayout({ acento = SAMPLY_BLUE, bodyHtml, ctaLabel, ctaUrl }) {
  return `
  <div style="font-family: 'Poppins', 'Helvetica Neue', Arial, sans-serif; background:${SAMPLY_BG}; padding: 32px 16px; margin:0;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 1px 4px rgba(13,27,75,0.08);">
      <div style="background:${SAMPLY_NAVY}; padding:22px 32px;">
        <span style="color:#ffffff; font-size:20px; font-weight:700; letter-spacing:0.3px;">sa<span style="color:${SAMPLY_SKY};">▮▮</span>ply</span>
      </div>
      <div style="height:4px; background:${acento};"></div>
      <div style="padding:32px; color:#1A2233; font-size:15px; line-height:1.65;">
        ${bodyHtml}
        ${ctaUrl ? `
        <div style="margin-top:28px;">
          <a href="${ctaUrl}" style="background:${SAMPLY_BLUE}; color:#ffffff; padding:12px 26px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px; display:inline-block;">
            ${ctaLabel}
          </a>
        </div>` : ''}
      </div>
      <div style="background:${SAMPLY_BG}; padding:16px 32px; color:#6B7A99; font-size:12px;">
        Samply Soporte — este es un email automático, no hace falta que lo respondas directamente.
      </div>
    </div>
  </div>`;
}

import { query } from '@/db/client';

/** Lista de destinatarios de "ticket nuevo" / "el cliente respondió".
 *  Primero busca en la tabla notificacion_emails (configurable desde el
 *  panel, sin redeploy); si está vacía, cae al env var ADMIN_NOTIFICATION_EMAIL
 *  (admite una sola dirección o varias separadas por coma) como respaldo. */
async function adminEmails() {
  try {
    const { rows } = await query('SELECT email FROM notificacion_emails ORDER BY email');
    if (rows.length > 0) return rows.map((r) => r.email);
  } catch (err) {
    console.log('[email] No se pudo leer notificacion_emails, usando ADMIN_NOTIFICATION_EMAIL:', err.message);
  }
  const raw = process.env.ADMIN_NOTIFICATION_EMAIL || '';
  return raw.split(',').map((e) => e.trim()).filter(Boolean);
}

/** Email a los administradores de Samply cuando un cliente crea un ticket. */
export async function notificarNuevoTicketAAdmins(ticket, clienteNombre) {
  const destinatarios = await adminEmails();
  if (destinatarios.length === 0) {
    console.log('[email] ADMIN_NOTIFICATION_EMAIL no configurado — no se notifica a nadie del lado Samply.');
    return { enviado: false, motivo: 'ADMIN_NOTIFICATION_EMAIL no configurado' };
  }
  const urlPanel = `${process.env.APP_URL || 'http://localhost:3000'}/admin/soporte`;
  return enviarEmail({
    to: destinatarios,
    subject: `Nuevo ticket ${ticket.codigo} — ${clienteNombre}`,
    html: emailLayout({
      acento: SAMPLY_BLUE,
      bodyHtml: `
        <p style="margin:0 0 16px;">Se creó un ticket nuevo en el panel de soporte.</p>
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <tr><td style="padding:4px 0; color:#6B7A99;">Ticket</td><td style="padding:4px 0; font-weight:600;">${ticket.codigo}</td></tr>
          <tr><td style="padding:4px 0; color:#6B7A99;">Cliente</td><td style="padding:4px 0; font-weight:600;">${clienteNombre}</td></tr>
          <tr><td style="padding:4px 0; color:#6B7A99;">Asunto</td><td style="padding:4px 0;">${ticket.asunto}</td></tr>
          <tr><td style="padding:4px 0; color:#6B7A99;">Categoría</td><td style="padding:4px 0;">${ticket.categoria}</td></tr>
          <tr><td style="padding:4px 0; color:#6B7A99;">Módulo</td><td style="padding:4px 0;">${ticket.modulo}</td></tr>
          <tr><td style="padding:4px 0; color:#6B7A99;">Prioridad</td><td style="padding:4px 0;">${ticket.prioridad}</td></tr>
        </table>
      `,
      ctaLabel: 'Ver en el panel',
      ctaUrl: urlPanel,
    }),
  });
}

/** Email de confirmación al cliente que creó el ticket. */
export async function confirmarTicketAlCliente(ticket, clienteEmail) {
  const urlPanel = `${process.env.APP_URL || 'http://localhost:3000'}/soporte`;
  return enviarEmail({
    to: clienteEmail,
    subject: `Ticket ${ticket.codigo} creado con éxito`,
    html: emailLayout({
      acento: SAMPLY_BLUE,
      bodyHtml: `
        <p style="margin:0 0 16px; font-size:16px; font-weight:600; color:${SAMPLY_NAVY};">¡Recibimos tu ticket!</p>
        <p style="margin:0 0 12px;">Tu ticket <strong>${ticket.codigo}</strong> — "${ticket.asunto}" — fue creado con éxito.</p>
        <p style="margin:0 0 12px;">Vamos a tomar el caso y te vamos a ir informando el estado a la brevedad, a medida que avancemos.</p>
        <p style="margin:0;">Gracias por avisarnos.</p>
      `,
      ctaLabel: 'Ver mi ticket',
      ctaUrl: urlPanel,
    }),
  });
}

/** Email al cliente cuando el staff le deja una respuesta/devolución en el ticket. */
export async function notificarRespuestaAlCliente(ticket, clienteEmail, mensaje, agenteNombre) {
  const urlPanel = `${process.env.APP_URL || 'http://localhost:3000'}/soporte`;
  return enviarEmail({
    to: clienteEmail,
    subject: `Nueva respuesta en tu ticket ${ticket.codigo}`,
    html: emailLayout({
      acento: SAMPLY_BLUE,
      bodyHtml: `
        <p style="margin:0 0 16px;">${agenteNombre ? `${agenteNombre} de` : 'El equipo de'} Samply Soporte te dejó una respuesta
        en tu ticket <strong>${ticket.codigo}</strong> — "${ticket.asunto}":</p>
        <div style="border-left:3px solid ${SAMPLY_BLUE}; background:${SAMPLY_BG}; margin:12px 0; padding:12px 16px; border-radius:0 8px 8px 0; color:#1A2233;">
          ${mensaje}
        </div>
      `,
      ctaLabel: 'Ver el ticket completo',
      ctaUrl: urlPanel,
    }),
  });
}

/** Email al staff de Samply cuando el CLIENTE responde en el hilo del ticket. */
export async function notificarRespuestaClienteAAdmins(ticket, clienteNombre, usuarioNombre, mensaje) {
  const destinatarios = await adminEmails();
  if (destinatarios.length === 0) {
    console.log('[email] ADMIN_NOTIFICATION_EMAIL no configurado — no se notifica a nadie del lado Samply.');
    return { enviado: false, motivo: 'ADMIN_NOTIFICATION_EMAIL no configurado' };
  }
  const urlPanel = `${process.env.APP_URL || 'http://localhost:3000'}/admin/soporte`;
  return enviarEmail({
    to: destinatarios,
    subject: `Respuesta del cliente en ${ticket.codigo}`,
    html: emailLayout({
      acento: SAMPLY_BLUE,
      bodyHtml: `
        <p style="margin:0 0 16px;">${usuarioNombre} de <strong>${clienteNombre}</strong> respondió en el ticket
        <strong>${ticket.codigo}</strong> — "${ticket.asunto}":</p>
        <div style="border-left:3px solid ${SAMPLY_BLUE}; background:${SAMPLY_BG}; margin:12px 0; padding:12px 16px; border-radius:0 8px 8px 0; color:#1A2233;">
          ${mensaje}
        </div>
      `,
      ctaLabel: 'Ver en el panel',
      ctaUrl: urlPanel,
    }),
  });
}

/** Email al cliente cuando CAMBIA EL ESTADO de su ticket (lo mueve el staff).
 *  "Resuelto" y "Cerrado" tienen un mensaje especial (más de cierre/logro);
 *  el resto de los estados usan un mensaje neutro de "avanzó de etapa". */
export async function notificarCambioEstadoAlCliente(ticket, clienteEmail, estadoNuevo, estadoAnterior) {
  const urlPanel = `${process.env.APP_URL || 'http://localhost:3000'}/soporte`;

  if (estadoNuevo === 'Resuelto') {
    return enviarEmail({
      to: clienteEmail,
      subject: `Tu ticket ${ticket.codigo} fue resuelto ✅`,
      html: emailLayout({
        acento: SAMPLY_GREEN,
        bodyHtml: `
          <p style="margin:0 0 16px; font-size:16px; font-weight:600; color:${SAMPLY_NAVY};">¡Buenas noticias!</p>
          <p style="margin:0 0 12px;">Tu ticket <strong>${ticket.codigo}</strong> — "${ticket.asunto}" — fue resuelto con éxito.</p>
          <p style="margin:0;">Si el problema persiste o te queda alguna duda, podés responder directamente en el chat de tu ticket y lo reabrimos.</p>
        `,
        ctaLabel: 'Ver mi ticket',
        ctaUrl: urlPanel,
      }),
    });
  }

  if (estadoNuevo === 'Cerrado') {
    return enviarEmail({
      to: clienteEmail,
      subject: `Tu ticket ${ticket.codigo} fue cerrado`,
      html: emailLayout({
        acento: SAMPLY_NAVY,
        bodyHtml: `
          <p style="margin:0 0 16px; font-size:16px; font-weight:600; color:${SAMPLY_NAVY};">Ticket cerrado</p>
          <p style="margin:0 0 12px;">Tu ticket <strong>${ticket.codigo}</strong> — "${ticket.asunto}" — quedó cerrado.</p>
          <p style="margin:0;">Si surge algo nuevo relacionado, no hace falta reabrir este — podés crear un ticket nuevo desde tu panel cuando quieras.</p>
        `,
        ctaLabel: 'Ir a mi panel',
        ctaUrl: urlPanel,
      }),
    });
  }

  return enviarEmail({
    to: clienteEmail,
    subject: `Tu ticket ${ticket.codigo} pasó a "${estadoNuevo}"`,
    html: emailLayout({
      acento: SAMPLY_BLUE,
      bodyHtml: `
        <p style="margin:0 0 16px;">El estado de tu ticket <strong>${ticket.codigo}</strong> — "${ticket.asunto}" —
        cambió de <strong>${estadoAnterior}</strong> a <strong>${estadoNuevo}</strong>.</p>
      `,
      ctaLabel: 'Ver el ticket completo',
      ctaUrl: urlPanel,
    }),
  });
}
