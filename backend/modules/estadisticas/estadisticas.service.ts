// ============================================================
//  modules/estadisticas/estadisticas.service.ts
//  Lógica de cálculo de métricas y estadísticas del dashboard.
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

    // Período activo
    const periodo = await prisma.periodoAcademico.findFirst({
      where: { activo: true },
      select: { id: true, nombre: true, anio: true, activo: true },
    });

    // Total alumnos activos e inactivos
    const alumnosTotal = await prisma.alumno.count();
    const alumnosBloqueados = await prisma.alumno.count({
      where: { bloqueo_manual: true },
    });

    // Total docentes activos
    const docentesTotal = await prisma.docente.count({
      where: { activo: true },
    });

    // Asistencia docentes hoy
    const asistenciaHoy = await prisma.asistenciaDocente.groupBy({
      by: ['estado'],
      where: {
        fecha: new Date(hoyDate),
      },
      _count: true,
    });

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

    // Bimestres
    let bimestresTotal = 0;
    let bimestresCerrados = 0;
    if (periodo) {
      bimestresTotal = await prisma.bimestre.count({
        where: { periodo_id: periodo.id },
      });
      bimestresCerrados = await prisma.bimestre.count({
        where: { periodo_id: periodo.id, cerrado: true },
      });
    }

    // Secciones
    let secciones = 0;
    if (periodo) {
      secciones = await prisma.seccion.count({
        where: { periodo_id: periodo.id },
      });
    }

    // Asignaciones docentes
    let asignaciones = 0;
    if (periodo) {
      asignaciones = await prisma.asignacionDocente.count({
        where: { periodo_id: periodo.id, activo: true },
      });
    }

    return {
      periodo: periodo
        ? { id: periodo.id, nombre: periodo.nombre, año: periodo.anio, activo: periodo.activo }
        : null,
      alumnos: {
        total: alumnosTotal,
        bloqueados: alumnosBloqueados,
      },
      docentes: {
        total: docentesTotal,
      },
      asistencia_hoy: {
        presentes,
        tardanzas,
        faltas,
        justificados,
        sin_registrar: sinRegistrar,
        total_docentes: totalDocentes,
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
