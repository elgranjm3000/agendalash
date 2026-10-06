import { db } from './db';
import { audit } from './audit';

export interface Email {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envía un email vía Resend. Si no hay RESEND_API_KEY configurada,
 * registra el email en la auditoría (visible para el super admin) y sigue.
 * Nunca lanza: los avisos no deben romper los procesos.
 */
export async function sendEmail(email: Email, meta?: { organizationId?: string | null }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'AgendaLash <onboarding@resend.dev>';

  if (!key) {
    // Sin configurar: queda registrado en auditoría para no perder el aviso
    await audit({
      action: 'email_skipped',
      entity: 'email',
      userEmail: email.to,
      organizationId: meta?.organizationId ?? null,
      detail: `SIN ENVIAR (falta RESEND_API_KEY) — ${email.subject}`,
    });
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: email.to, subject: email.subject, html: email.html }),
      signal: AbortSignal.timeout(10000),
    });
    const ok = res.ok;
    await audit({
      action: ok ? 'email_sent' : 'email_failed',
      entity: 'email',
      userEmail: email.to,
      organizationId: meta?.organizationId ?? null,
      detail: email.subject,
    });
    return ok;
  } catch {
    await audit({
      action: 'email_failed',
      entity: 'email',
      userEmail: email.to,
      organizationId: meta?.organizationId ?? null,
      detail: `Error de red — ${email.subject}`,
    });
    return false;
  }
}
