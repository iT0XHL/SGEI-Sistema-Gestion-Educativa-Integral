// ============================================================
//  modules/estadisticas/estadisticas.service.ts
//  Lógica de cálculo de métricas y estadísticas del dashboard.
//  Queries independientes se ejecutan en paralelo.
// ============================================================
import { prisma } from '@/lib/prisma';

export interface EstadisticasDTO {
  periodo: { id: string; nombre: string; año: number; activo: boolean } | null;
  alumnos: { total: number; bloqueados: number };
  docentes: { total: number };
  asistencia_hoy: {
    presentes: number;
    tardanzas: number;
    faltas: number;
    justificados: number;
    sin_registrar: number;
    total_docentes: number;
  };
  bimestres: { total: number; cerrados: number; abiertos: number };
  secciones: number;
  asignaciones: number;
}

export const EstadisticasService = {
  async obtener(): Promise<EstadisticasDTO> {
    const hoy = new Date();
    const hoyDate = hoy.toISOString().split('T')[0];

    // ── Queries independientes (se ejecutan en paralelo) ──────
    const [periodo, alumnosTotal, alumnosBloqueados, docentesTotal, asistenciaHoy] =
      await Promise.all([
        prisma.periodoAcademico.findFirst({
          where: { activo: true },
          select: { id: true, nombre: true, anio: true, activo: true },
        }),
        prisma.alumno.count(),
        prisma.alumno.count({ where: { bloqueo_manual: true } }),
        prisma.docente.count({ where: { activo: true } }),
        prisma.asistenciaDocente.groupBy({
          by: ['estado'],
          where: { fecha: new Date(hoyDate) },
          _count: true,
        }),
      ]);

    // ── Procesar asistencia ────────────────────────────────────
    const asistenciaMap = new Map(
      asistenciaHoy.map((a) => [a.estado, a._count]),
    );
    const presentes = asistenciaMap.get('P') || 0;
    const tardanzas = asistenciaMap.get('T') || 0;
    const faltas = asistenciaMap.get('F') || 0;
    const justificados = asistenciaMap.get('J') || 0;
    const registrados = presentes + tardanzas + faltas + justificados;
    const totalDocentes = docentesTotal;
    const sinRegistrar = Math.max(0, totalDocentes - registrados);

    // ── Queries que dependen del periodo (paralelas) ──────────
    let bimestresTotal = 0;
    let bimestresCerrados = 0;
    let secciones = 0;
    let asignaciones = 0;

    if (periodo) {
      [bimestresTotal, bimestresCerrados, secciones, asignaciones] = await Promise.all([
        prisma.bimestre.count({ where: { periodo_id: periodo.id } }),
        prisma.bimestre.count({ where: { periodo_id: periodo.id, cerrado: true } }),
        prisma.seccion.count({ where: { periodo_id: periodo.id } }),
        prisma.asignacionDocente.count({ where: { periodo_id: periodo.id, activo: true } }),
      ]);
    }

    return {
      periodo: periodo
        ? { id: periodo.id, nombre: periodo.nombre, año: periodo.anio, activo: periodo.activo }
        : null,
      alumnos: { total: alumnosTotal, bloqueados: alumnosBloqueados },
      docentes: { total: docentesTotal },
      asistencia_hoy: {
        presentes, tardanzas, faltas, justificados,
        sin_registrar: sinRegistrar, total_docentes: totalDocentes,
      },
      bimestres: {
        total: bimestresTotal,
        cerrados: bimestresCerrados,
        abiertos: bimestresTotal - bimestresCerrados,
      },
      secciones,
      asignaciones,
    };
  },
};
