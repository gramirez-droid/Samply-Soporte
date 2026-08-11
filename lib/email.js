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

/** Email a los administradores de Samply cuando un cliente crea un ticket. */
export async function notificarNuevoTicketAAdmins(ticket, clienteNombre) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    console.log('[email] ADMIN_NOTIFICATION_EMAIL no configurado — no se notifica a nadie del lado Samply.');
    return { enviado: false, motivo: 'ADMIN_NOTIFICATION_EMAIL no configurado' };
  }
  const urlPanel = `${process.env.APP_URL || 'http://localhost:3000'}/admin/soporte`;
  return enviarEmail({
    to: adminEmail,
    subject: `Nuevo ticket ${ticket.codigo} — ${clienteNombre}`,
    html: `
      <p>Se creó un ticket nuevo en el panel de soporte.</p>
      <ul>
        <li><strong>Ticket:</strong> ${ticket.codigo}</li>
        <li><strong>Cliente:</strong> ${clienteNombre}</li>
        <li><strong>Asunto:</strong> ${ticket.asunto}</li>
        <li><strong>Categoría:</strong> ${ticket.categoria}</li>
        <li><strong>Módulo:</strong> ${ticket.modulo}</li>
        <li><strong>Prioridad:</strong> ${ticket.prioridad}</li>
      </ul>
      <p><a href="${urlPanel}">Ver en el panel de soporte</a></p>
    `,
  });
}

/** Email de confirmación al cliente que creó el ticket. */
export async function confirmarTicketAlCliente(ticket, clienteEmail) {
  return enviarEmail({
    to: clienteEmail,
    subject: `Recibimos tu ticket ${ticket.codigo}`,
    html: `
      <p>Hola,</p>
      <p>Tu ticket <strong>${ticket.codigo}</strong> — "${ticket.asunto}" — fue creado con éxito.
      Nuestro equipo lo va a revisar a la brevedad.</p>
      <p>Gracias por avisarnos.</p>
      <p>— Samply Soporte</p>
    `,
  });
}

/** Email al cliente cuando el staff le deja una respuesta/devolución en el ticket. */
export async function notificarRespuestaAlCliente(ticket, clienteEmail, mensaje, agenteNombre) {
  const urlPanel = `${process.env.APP_URL || 'http://localhost:3000'}/soporte`;
  return enviarEmail({
    to: clienteEmail,
    subject: `Nueva respuesta en tu ticket ${ticket.codigo}`,
    html: `
      <p>Hola,</p>
      <p>${agenteNombre ? `${agenteNombre} de` : 'El equipo de'} Samply Soporte te dejó una respuesta
      en tu ticket <strong>${ticket.codigo}</strong> — "${ticket.asunto}":</p>
      <blockquote style="border-left: 3px solid #1565C0; margin: 12px 0; padding: 8px 16px; color: #333;">
        ${mensaje}
      </blockquote>
      <p><a href="${urlPanel}">Ver el ticket completo en tu panel</a></p>
      <p>— Samply Soporte</p>
    `,
  });
}

/** Email al staff de Samply cuando el CLIENTE responde en el hilo del ticket. */
export async function notificarRespuestaClienteAAdmins(ticket, clienteNombre, usuarioNombre, mensaje) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    console.log('[email] ADMIN_NOTIFICATION_EMAIL no configurado — no se notifica a nadie del lado Samply.');
    return { enviado: false, motivo: 'ADMIN_NOTIFICATION_EMAIL no configurado' };
  }
  return enviarEmail({
    to: adminEmail,
    subject: `Respuesta del cliente en ${ticket.codigo}`,
    html: `
      <p>${usuarioNombre} de <strong>${clienteNombre}</strong> respondió en el ticket
      <strong>${ticket.codigo}</strong> — "${ticket.asunto}":</p>
      <blockquote style="border-left: 3px solid #1565C0; margin: 12px 0; padding: 8px 16px; color: #333;">
        ${mensaje}
      </blockquote>
      <p>Ver en el panel de soporte</p>
    `,
  });
}
