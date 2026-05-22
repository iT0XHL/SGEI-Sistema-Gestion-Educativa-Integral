import { prisma } from '@/lib/prisma';
import { withAuditContext } from '@/lib/audit-context';
import { Prisma } from '@prisma/client';

// ── Helper: fetch reviewer usernames sin cross-schema join ─────
// Consulta DENTRO de auth_schema (perfil_usuario → credencial).
// Evita el join cross-schema financial → auth que falla en Prisma multiSchema.
async function fetchRevisorMap(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const perfiles = await prisma.perfilUsuario.findMany({
    where:  { id: { in: ids } },
    select: { id: true, credencial: { select: { usuario_login: true } } },
  });
  for (const p of perfiles) map.set(p.id, p.credencial.usuario_login);
  return map;
}

function buildRevisor(
  revisadoPor: string | null,
  revisorMap: Map<string, string>,
): { nombres: string } | null {
  if (!revisadoPor) return null;
  const login = revisorMap.get(revisadoPor);
  return login ? { nombres: login } : null;
}

// ── Repository ────────────────────────────────────────────────

export const BoletaRepository = {
  async create(
    data: {
      pago_id:           string;
      url_archivo:       string;
      nombre_archivo?:   string;
      banco?:            string;
      numero_operacion?: string;
    },
    perfilId: string,
  ) {
    // tg_boleta_insertada fires AFTER INSERT → transitions pago.estado Pendiente→En_Revision
    // tg_audit_boleta fires AFTER INSERT → requires withAuditContext
    return withAuditContext(perfilId, async (tx) => {
      return tx.boletaPago.create({
        data: {
          pago_id:          data.pago_id,
          url_archivo:      data.url_archivo,
          nombre_archivo:   data.nombre_archivo ?? null,
          banco:            data.banco ?? null,
          numero_operacion: data.numero_operacion ?? null,
        },
        include: {
          pago: {
            include: {
              alumno:   { select: { nombres: true, apellido_paterno: true } },
              concepto: { select: { nombre: true } },
            },
          },
        },
      });
    });
  },

  async findMany(filters: {
    alumnoId?:       string;
    pagoId?:         string;
    estadoRevision?: string;
  }) {
    const rows = await prisma.boletaPago.findMany({
      where: {
        ...(filters.pagoId         ? { pago_id:         filters.pagoId }                  : {}),
        ...(filters.estadoRevision ? { estado_revision: filters.estadoRevision as never } : {}),
        ...(filters.alumnoId       ? { pago: { alumno_id: filters.alumnoId } }            : {}),
      },
      include: {
        pago: {
          include: {
            alumno: {
              select: {
                nombres:          true,
                apellido_paterno: true,
                seccion: { select: { nombre: true, grado: { select: { nombre: true } } } },
              },
            },
            concepto: { select: { nombre: true } },
          },
        },
        // Sin include cross-schema (financial → auth). Reviewer se resuelve abajo.
      },
      orderBy: { fecha_subida: 'desc' },
    });

    const revisorIds = [...new Set(
      rows.map(r => r.revisado_por).filter((id): id is string => id !== null),
    )];
    const revisorMap = await fetchRevisorMap(revisorIds);

    return rows.map(r => ({ ...r, revisor: buildRevisor(r.revisado_por, revisorMap) }));
  },

  async findOne(id: string) {
    const row = await prisma.boletaPago.findUnique({
      where: { id },
      include: {
        pago: {
          include: {
            alumno:   { select: { nombres: true, apellido_paterno: true } },
            concepto: { select: { nombre: true } },
          },
        },
        // Sin include cross-schema (financial → auth). Reviewer se resuelve abajo.
      },
    });
    if (!row) return null;
    const revisorMap = await fetchRevisorMap(row.revisado_por ? [row.revisado_por] : []);
    return { ...row, revisor: buildRevisor(row.revisado_por, revisorMap) };
  },

  async findByPagoId(pagoId: string) {
    return prisma.boletaPago.findUnique({
      where: { pago_id: pagoId },
    });
  },

  /**
   * Llama al SP financial_schema.revisar_boleta.
   * El SP valida rol, gestiona transiciones, sincroniza pago y crea notificaciones.
   * Los triggers tg_audit_boleta / tg_audit_pago requieren withAuditContext.
   */
  async revisar(
    boletaId:           string,
    revisorId:          string,
    nuevoEstado:        'Aprobada' | 'Rechazada',
    observacionRechazo: string | null,
    perfilId:           string,
  ) {
    return withAuditContext(perfilId, async (tx) => {
      await tx.$executeRaw`
        CALL financial_schema.revisar_boleta(
          ${Prisma.sql`${boletaId}::uuid`},
          ${Prisma.sql`${revisorId}::uuid`},
          ${nuevoEstado}::financial_schema.estado_revision_boleta,
          ${observacionRechazo}::text
        )
      `;
    });
  },
};
