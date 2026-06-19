// ============================================================================
//  modules/notificaciones/notificacion-recipient-resolver.ts
//  Resuelve QUIÉN debe recibir una notificación según el evento (§7, §12, §26.5).
//
//  REGLA DE ORO (§19.5/§19.6): los destinatarios SIEMPRE se resuelven en backend
//  a partir de relaciones reales (alumno dueño, alumnos de la sección, admins
//  activos, ...). El frontend nunca decide los destinatarios.
//
//  Devuelve perfil_usuario.id (= notificacion.usuario_destino_id), sin duplicados
//  y excluyendo al actor (salvo que el evento lo requiera).
// ============================================================================
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { NotificationEvents, type NotificationEvent } from './notificacion.events';

type Db = typeof prisma | Prisma.TransactionClient;

/** Contexto de resolución: identificadores de las entidades involucradas. */
export interface ResolverContexto {
  /** Perfil del actor (para no auto-notificarse). */
  actorPerfilId?: string;

  alumnoId?:   string;   // academic_schema.alumno.id
  docenteId?:  string;   // academic_schema.docente.id
  seccionId?:  string;   // academic_schema.seccion.id

  /** Forzar destinatarios explícitos (comunicados manuales). */
  destinatariosExplicitos?: string[];

  /** Incluir al actor entre los destinatarios (excepción §7.1). */
  incluirActor?: boolean;
}

// ── Helpers de consulta ──────────────────────────────────────────────────────

async function perfilesPorRol(db: Db, rol: 'Admin' | 'Secretaria'): Promise<string[]> {
  const rows = await db.perfilUsuario.findMany({
    where:  { rol, credencial: { activo: true } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function perfilDeAlumno(db: Db, alumnoId: string): Promise<string[]> {
  const alumno = await db.alumno.findUnique({
    where:  { id: alumnoId },
    select: { perfil_usuario_id: true },
  });
  return alumno ? [alumno.perfil_usuario_id] : [];
}

async function perfilDeDocente(db: Db, docenteId: string): Promise<string[]> {
  const docente = await db.docente.findUnique({
    where:  { id: docenteId },
    select: { perfil_usuario_id: true },
  });
  return docente ? [docente.perfil_usuario_id] : [];
}

async function perfilesAlumnosDeSeccion(db: Db, seccionId: string): Promise<string[]> {
  const alumnos = await db.alumno.findMany({
    where:  { seccion_id: seccionId, activo: true },
    select: { perfil_usuario_id: true },
  });
  return alumnos.map((a) => a.perfil_usuario_id);
}

// ── Resolver principal ───────────────────────────────────────────────────────

/**
 * Devuelve los perfil_usuario.id que deben recibir la notificación del evento.
 * Aplica las reglas de destinatarios de §6/§7 y deduplica.
 */
export async function resolverDestinatarios(
  evento: NotificationEvent,
  ctx:    ResolverContexto,
  db:     Db = prisma,
): Promise<string[]> {
  // Atajo: comunicados u otros casos con destinatarios ya resueltos.
  if (ctx.destinatariosExplicitos?.length) {
    return dedupeYExcluirActor(ctx.destinatariosExplicitos, ctx);
  }

  let destinos: string[] = [];

  switch (evento) {
    // ── Administrativos: admins + secretarías (+ entidad creada) ──────────────
    case NotificationEvents.DOCENTE_CREADO: {
      const [admins, secre, docente] = await Promise.all([
        perfilesPorRol(db, 'Admin'),
        perfilesPorRol(db, 'Secretaria'),
        ctx.docenteId ? perfilDeDocente(db, ctx.docenteId) : Promise.resolve([]),
      ]);
      destinos = [...admins, ...secre, ...docente];
      break;
    }
    case NotificationEvents.DOCENTE_ACTUALIZADO: {
      const [admins, secre] = await Promise.all([
        perfilesPorRol(db, 'Admin'),
        perfilesPorRol(db, 'Secretaria'),
      ]);
      destinos = [...admins, ...secre];
      break;
    }
    case NotificationEvents.ALUMNO_CREADO: {
      const [admins, secre, alumno] = await Promise.all([
        perfilesPorRol(db, 'Admin'),
        perfilesPorRol(db, 'Secretaria'),
        ctx.alumnoId ? perfilDeAlumno(db, ctx.alumnoId) : Promise.resolve([]),
      ]);
      destinos = [...admins, ...secre, ...alumno];
      break;
    }
    case NotificationEvents.ALUMNO_ACTUALIZADO: {
      const [admins, secre, alumno] = await Promise.all([
        perfilesPorRol(db, 'Admin'),
        perfilesPorRol(db, 'Secretaria'),
        ctx.alumnoId ? perfilDeAlumno(db, ctx.alumnoId) : Promise.resolve([]),
      ]);
      destinos = [...admins, ...secre, ...alumno];
      break;
    }

    // ── Académicos dirigidos al alumno dueño ─────────────────────────────────
    case NotificationEvents.NOTA_REGISTRADA:
    case NotificationEvents.NOTA_ACTUALIZADA:
    case NotificationEvents.TAREA_CALIFICADA:
    case NotificationEvents.LIBRETA_PUBLICADA:
    case NotificationEvents.LIBRETA_BLOQUEADA:
    case NotificationEvents.PAGO_REGISTRADO:
    case NotificationEvents.BOLETA_REVISADA: {
      destinos = ctx.alumnoId ? await perfilDeAlumno(db, ctx.alumnoId) : [];
      break;
    }

    // ── Masivos a una sección (§7.4, §26.7) ──────────────────────────────────
    case NotificationEvents.MATERIAL_PUBLICADO:
    case NotificationEvents.ACTIVIDAD_PUBLICADA: {
      destinos = ctx.seccionId ? await perfilesAlumnosDeSeccion(db, ctx.seccionId) : [];
      break;
    }

    // ── Boleta subida → secretarías + admins (supervisión) ───────────────────
    case NotificationEvents.BOLETA_SUBIDA:
    case NotificationEvents.NOTAS_ENVIADAS_A_SECRETARIA: {
      const [admins, secre] = await Promise.all([
        perfilesPorRol(db, 'Admin'),
        perfilesPorRol(db, 'Secretaria'),
      ]);
      destinos = [...admins, ...secre];
      break;
    }

    // ── Período actualizado: todos (docentes, secretarías, alumnos, admins) ──
    case NotificationEvents.PERIODO_ACTUALIZADO: {
      const rows = await db.perfilUsuario.findMany({
        where:  { credencial: { activo: true } },
        select: { id: true },
      });
      destinos = rows.map((r) => r.id);
      break;
    }

    // ── Comunicado general sin destinatarios explícitos: todos ───────────────
    case NotificationEvents.COMUNICADO_GENERAL: {
      const rows = await db.perfilUsuario.findMany({
        where:  { credencial: { activo: true } },
        select: { id: true },
      });
      destinos = rows.map((r) => r.id);
      break;
    }

    default: {
      const _never: never = evento;
      void _never;
      destinos = [];
    }
  }

  return dedupeYExcluirActor(destinos, ctx);
}

function dedupeYExcluirActor(ids: string[], ctx: ResolverContexto): string[] {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (ctx.incluirActor || !ctx.actorPerfilId) return unique;
  return unique.filter((id) => id !== ctx.actorPerfilId);
}
