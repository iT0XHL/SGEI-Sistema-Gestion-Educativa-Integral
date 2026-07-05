import { env } from '@/config/env';
import type { EmailSender } from './email-sender';

/**
 * Implementación por defecto usando la API HTTP de Resend (sin SDK, para no
 * añadir una dependencia nueva). Si RESEND_API_KEY no está configurada, no
 * envía nada y solo deja constancia en logs (modo dev/staging).
 */
export const ResendEmailSender: EmailSender = {
  async enviarRecuperacion(destinatario: string, token: string): Promise<void> {
    const link = `${env.FRONTEND_ORIGIN}/reset-password?token=${token}`;

    if (!env.RESEND_API_KEY) {
      console.warn(`[email] RESEND_API_KEY no configurada. Link de recuperación para ${destinatario}: ${link}`);
      return;
    }

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    env.EMAIL_FROM,
        to:      [destinatario],
        subject: 'Recupera tu contraseña — SGEI',
        html: `
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p><a href="${link}">Haz clic aquí para elegir una nueva contraseña</a> (válido por 30 minutos).</p>
          <p>Si no fuiste tú, ignora este correo.</p>
        `,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      console.error(`[email] Error enviando recuperación a ${destinatario}: ${resp.status} ${body}`);
    }
  },
};
