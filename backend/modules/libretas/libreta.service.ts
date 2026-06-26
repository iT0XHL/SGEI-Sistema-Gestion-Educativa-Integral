import { ForbiddenError, NotFoundError, ConflictError, BusinessRuleError } from '@/errors/http-errors';
import { prisma } from '@/lib/prisma';
import { AuditService } from '@/modules/auditoria/audit.service';
import { LibretaRepository } from './libreta.repository';
import type { JwtClaims } from '@/lib/jwt';

type EstadoDestino = 'EN_REVISION' | 'OBSERVADA' | 'APROBADA' | 'PUBLICADA' | 'ANULADA';

/** Transiciones válidas del flujo de estados de la libreta. */
const TRANSICIONES: Record<string, EstadoDestino[]> = {
  BORRADOR:    ['EN_REVISION', 'OBSERVADA', 'APROBADA', 'ANULADA'],
  EN_REVISION: ['OBSERVADA', 'APROBADA', 'ANULADA'],
  OBSERVADA:   ['EN_REVISION', 'APROBADA', 'ANULADA'],
  APROBADA:    ['PUBLICADA', 'OBSERVADA', 'ANULADA'],
  PUBLICADA:   ['ANULADA'],
  BLOQUEADA:   ['ANULADA'],
  ANULADA:     [],
};

function assertStaff(user: JwtClaims) {
  if (user.rol !== 'Admin' && user.rol !== 'Secretaria') {
    throw new ForbiddenError('INSUFFICIENT_ROLE', 'Solo Admin o Secretaría pueden gestionar libretas.');
  }
}

export const LibretaService = {
  async obtener(alumnoId: string, bimestreId: string | undefined, user: JwtClaims) {
    if (user.rol === 'Alumno') {
      if (user.entidadId !== alumnoId) {
        throw new ForbiddenError('LIBRETA_AJENA', 'Solo puedes ver tu propia libreta.');
      }
      const bloqueada = await LibretaRepository.bloqueoActivo(alumnoId);
      if (bloqueada) {
        throw new ForbiddenError(
          'LIBRETA_BLOQUEADA',
          'Tu libreta está bloqueada por deuda pendiente o bloqueo administrativo.',
        );
      }
    }

    await LibretaRepository.refrescarVista();
    const rows = await LibretaRepository.obtener(alumnoId, bimestreId);
    if (rows.length === 0) throw new NotFoundError('Libreta del alumno');
    return rows;
  },

  async generarPdf(
    alumnoId:   string,
    bimestreId: string | undefined,
    user:       JwtClaims,
    ip?:        string,
    userAgent?: string,
  ) {
    if (user.rol === 'Alumno') {
      if (user.entidadId !== alumnoId) {
        throw new ForbiddenError('LIBRETA_AJENA', 'Solo puedes descargar tu propia libreta.');
      }
      const bloqueada = await LibretaRepository.bloqueoActivo(alumnoId);
      if (bloqueada) {
        throw new ForbiddenError(
          'LIBRETA_BLOQUEADA',
          'Tu libreta está bloqueada por deuda pendiente o bloqueo administrativo.',
        );
      }
    }

    await LibretaRepository.refrescarVista();
    const rows = await LibretaRepository.obtener(alumnoId, bimestreId);
    if (rows.length === 0) throw new NotFoundError('Libreta del alumno');

    await AuditService.log({
      usuarioId:       user.perfilId,
      tipo:            'READ_SENSITIVE',
      modulo:          'libretas',
      entidadAfectada: 'mv_libreta_alumno',
      entidadId:       alumnoId,
      ip,
      userAgent,
    });

    return rows;
  },

  // ── Secretaría / Admin: flujo de generación y estados ──────────────

  /** Genera (snapshot inmutable) la libreta del alumno para un bimestre. */
  async generar(alumnoId: string, bimestreId: string, user: JwtClaims) {
    assertStaff(user);

    const bimestre = await prisma.bimestre.findUnique({ where: { id: bimestreId } });
    if (!bimestre) throw new NotFoundError('Bimestre');

    const actual = await LibretaRepository.libretaActual(alumnoId, bimestreId);
    if (actual && (actual.estado === 'APROBADA' || actual.estado === 'PUBLICADA')) {
      throw new ConflictError(
        `La libreta ya está ${actual.estado === 'PUBLICADA' ? 'publicada' : 'aprobada'}; anúlala antes de regenerar.`,
      );
    }

    const snapshot = await LibretaRepository.notasSnapshot(alumnoId, bimestreId);
    if (snapshot.length === 0) {
      throw new BusinessRuleError('SIN_NOTAS', 'El alumno no tiene notas registradas en este bimestre.');
    }

    const libreta = await LibretaRepository.crearSnapshot({
      alumnoId,
      bimestreId,
      periodoId:  bimestre.periodo_id,
      generadaPor: user.perfilId,
      snapshot: snapshot.map((s) => ({
        ...s,
        nota_vigesimal: s.nota_vigesimal !== null ? parseFloat(String(s.nota_vigesimal)) : null,
      })),
    });

    await AuditService.log({
      usuarioId: user.perfilId, tipo: 'CREATE', modulo: 'libretas',
      entidadAfectada: 'libreta', entidadId: libreta.id, newValue: { version: libreta.version },
    });
    return libreta;
  },

  /** Cambia el estado de la libreta validando la transición del flujo. */
  async cambiarEstado(id: string, estado: EstadoDestino, user: JwtClaims, observacion?: string | null) {
    assertStaff(user);

    const libreta = await LibretaRepository.findLibreta(id);
    if (!libreta) throw new NotFoundError('Libreta');

    const permitidos = TRANSICIONES[libreta.estado] ?? [];
    if (!permitidos.includes(estado)) {
      throw new ConflictError(`No se puede pasar la libreta de ${libreta.estado} a ${estado}.`);
    }
    if (estado === 'OBSERVADA' && (!observacion || !observacion.trim())) {
      throw new BusinessRuleError('OBSERVACION_REQUERIDA', 'Indica el motivo de la observación.');
    }

    const actualizada = await LibretaRepository.actualizarEstado(id, estado, user.perfilId);

    await AuditService.log({
      usuarioId: user.perfilId, tipo: 'UPDATE', modulo: 'libretas',
      entidadAfectada: 'libreta', entidadId: id,
      oldValue: { estado: libreta.estado },
      newValue: { estado, observacion: observacion ?? null },
    });
    return actualizada;
  },

  /** Resumen de la sección: avance de notas + estado de libreta por alumno. */
  async resumenSeccion(seccionId: string, bimestreId: string | undefined, user: JwtClaims) {
    assertStaff(user);
    return LibretaRepository.resumenSeccion(seccionId, bimestreId);
  },

  /** Estado de recepción de notas por curso/sección (qué está listo para libreta). */
  async estadoRecepcion(
    query: {
      periodoId?: string; bimestreId?: string; nivelId?: string;
      gradoId?: string; seccionId?: string; cursoId?: string; docenteId?: string;
    },
    user: JwtClaims,
  ) {
    assertStaff(user);
    return LibretaRepository.estadoRecepcion(query);
  },
};
