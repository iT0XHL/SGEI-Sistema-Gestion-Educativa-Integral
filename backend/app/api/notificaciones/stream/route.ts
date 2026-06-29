// ============================================================================
//  app/api/notificaciones/stream/route.ts — Canal SSE de notificaciones (§14, §15).
//
//  · Valida la sesión (cookie HttpOnly) del usuario.
//  · Abre una conexión text/event-stream.
//  · Se suscribe al bus de notificaciones SOLO para ese usuario.
//  · Reenvía cada notificación nueva como evento SSE.
//  · Envía un heartbeat periódico para mantener viva la conexión.
//  · Limpia la suscripción al desconectarse el cliente.
// ============================================================================
import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { errorResponse } from '@/lib/response';
import { notificationBus } from '@/lib/notification-bus';
import { env } from '@/config/env';

// SSE necesita Node (EventEmitter) y respuesta dinámica sin caché.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEARTBEAT_MS = 25_000;

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin');
  const allow = origin === env.FRONTEND_ORIGIN ? origin : env.FRONTEND_ORIGIN;
  return {
    'Access-Control-Allow-Origin':      allow,
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function GET(req: NextRequest): Response {
  let user;
  try {
    user = getUserFromRequest(req);
  } catch (e) {
    return errorResponse(e);
  }

  const perfilId = user.perfilId;
  const encoder  = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let cerrado = false;
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let unsubscribe: (() => void) | null = null;

      const cleanup = () => {
        if (cerrado) return;
        cerrado = true;
        if (heartbeat) clearInterval(heartbeat);
        if (unsubscribe) unsubscribe();
        try {
          controller.close();
        } catch {
          /* ya cerrado */
        }
      };

      const enqueue = (chunk: string) => {
        if (cerrado) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      // Evento inicial: confirma la conexión (el frontend lo usa para marcar
      // el canal en vivo como activo y suspender el polling agresivo).
      enqueue(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

      // Suscripción específica del usuario.
      unsubscribe = notificationBus.subscribe(perfilId, (n) => {
        enqueue(`event: notificacion\ndata: ${JSON.stringify(n)}\n\n`);
      });

      // Heartbeat (comentario SSE) para mantener viva la conexión y detectar cortes.
      heartbeat = setInterval(() => {
        enqueue(`: ping ${Date.now()}\n\n`);
      }, HEARTBEAT_MS);

      // El cliente cerró la conexión (cambió de página, cerró pestaña, etc.).
      req.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream; charset=utf-8',
      'Cache-Control':     'no-cache, no-transform',
      Connection:          'keep-alive',
      'X-Accel-Buffering': 'no', // evita buffering en proxies (nginx)
      ...corsHeaders(req),
    },
  });
}
