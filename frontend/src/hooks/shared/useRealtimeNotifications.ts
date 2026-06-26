// ============================================================================
//  hooks/shared/useRealtimeNotifications.ts
//  Canal de notificaciones en tiempo real vía SSE (§14, §17, §26.8, §26.9).
//
//  · Abre un EventSource a /api/notificaciones/stream con la cookie de sesión.
//  · Al llegar una notificación:
//      1. muestra un toast;
//      2. la INSERTA al instante en la cache (historial de la campana) y
//         sube el contador, sin esperar a un refetch;
//      3. invalida para reconciliar con el servidor (consistencia eventual).
//  · Fallback: si el canal SSE falla, el polling de useNotificaciones /
//    useContarNoLeidas (refetchInterval) sigue trayendo las novedades.
//  · Se reconecta automáticamente (EventSource lo hace por defecto) y se cierra
//    al desmontar.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BASE_URL } from '../../lib/api/client';
import type {
  Notificacion,
  NotificacionRealtime,
  ContadorNotificaciones,
} from '../../types/notificacion';

const STREAM_URL = `${BASE_URL}/api/notificaciones/stream`;

interface Options {
  /** Si false, no se abre el canal (p. ej. usuario no autenticado). */
  enabled?: boolean;
  /** Callback opcional al recibir una notificación (p. ej. navegar). */
  onNotificacion?: (n: NotificacionRealtime) => void;
}

/** Convierte el payload SSE en la Notificacion persistida (para el historial). */
function toNotificacion(n: NotificacionRealtime): Notificacion {
  return {
    id:                 n.id,
    usuario_destino_id: n.usuario_destino_id,
    tipo:               n.tipo as Notificacion['tipo'],
    titulo:             n.titulo,
    cuerpo:             n.cuerpo,
    url_accion:         n.url_accion,
    leida:              n.leida,
    fecha_lectura:      null,
    created_at:         n.created_at,
  };
}

export function useRealtimeNotifications({ enabled = true, onNotificacion }: Options = {}) {
  const qc = useQueryClient();
  const [conectado, setConectado] = useState(false);
  const onNotifRef = useRef(onNotificacion);
  onNotifRef.current = onNotificacion;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('EventSource' in window)) {
      return;
    }

    // withCredentials envía la cookie HttpOnly de sesión (cross-origin a :3001).
    const es = new EventSource(STREAM_URL, { withCredentials: true });

    es.addEventListener('ready', () => {
      setConectado(true);
      // En cada (re)conexión, recupera lo que pudo perderse mientras el canal
      // estuvo caído (el bus no reenvía eventos pasados).
      qc.invalidateQueries({ queryKey: ['notificaciones'] });
    });

    es.addEventListener('notificacion', (ev: MessageEvent) => {
      let n: NotificacionRealtime | null = null;
      try {
        n = JSON.parse(ev.data) as NotificacionRealtime;
      } catch {
        return;
      }
      if (!n) return;
      const nueva = n;

      // 1. Toast en vivo (§17.7). La prioridad alta/urgente usa estilo de alerta.
      const esAlerta = nueva.prioridad === 'alta' || nueva.prioridad === 'urgente';
      (esAlerta ? toast.warning : toast)(nueva.titulo, { description: nueva.cuerpo });

      // 2. Inserción OPTIMISTA en el historial (todas las variantes de la lista).
      qc.setQueriesData<Notificacion[]>({ queryKey: ['notificaciones', 'lista'] }, (old) => {
        const lista = old ?? [];
        if (lista.some((x) => x.id === nueva.id)) return lista; // evita duplicado
        return [toNotificacion(nueva), ...lista];
      });

      // 3. Sube el contador del badge al instante (si no viene leída).
      if (!nueva.leida) {
        qc.setQueryData<ContadorNotificaciones>(['notificaciones', 'contar'], (old) => ({
          no_leidas: (old?.no_leidas ?? 0) + 1,
        }));
      }

      // 4. Reconcilia con el servidor (fuente de verdad).
      qc.invalidateQueries({ queryKey: ['notificaciones'] });

      onNotifRef.current?.(nueva);
    });

    es.onerror = () => {
      // EventSource reintenta solo; marcamos desconectado para que el polling
      // de respaldo cubra el intervalo sin canal en vivo.
      setConectado(false);
    };

    return () => {
      es.close();
      setConectado(false);
    };
  }, [enabled, qc]);

  return { conectado };
}
