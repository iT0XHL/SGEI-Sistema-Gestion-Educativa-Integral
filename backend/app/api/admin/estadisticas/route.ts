// ============================================================
//  GET /api/admin/estadisticas
//  KPIs del panel de administración:
//  - Período activo, alumnos, docentes, asistencia hoy,
//    bimestres, secciones y asignaciones.
// ============================================================
import { withRole } from '@/lib/auth';
import { ok } from '@/lib/response';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const GET = withRole(['Admin', 'Secretaria'], async () => {
  // Período activo + total docentes activos
  const [periodo, docentesActivos] = await Promise.all([
    prisma.periodoAcademico.findFirst({ where: { activo: true } }),
    prisma.docente.count({ where: { activo: true } }),
  ]);

  // Conteos dependientes del período activo
  let alumnosActivos    = 0;
  let alumnosBloqueados = 0;
  let bimestresTotal    = 0;
  let bimestresCerrados = 0;
  let secciones         = 0;
  let asignaciones      = 0;

  if (periodo) {
    [
      alumnosActivos,
      alumnosBloqueados,
      bimestresTotal,
      bimestresCerrados,
      secciones,
      asignaciones,
    ] = await Promise.all([
      prisma.alumno.count({ where: { periodo_id: periodo.id, activo: true } }),
      prisma.alumno.count({ where: { periodo_id: periodo.id, activo: true, bloqueo_manual: true } }),
      prisma.bimestre.count({ where: { periodo_id: periodo.id } }),
      prisma.bimestre.count({ where: { periodo_id: periodo.id, cerrado: true } }),
      prisma.seccion.count({ where: { periodo_id: periodo.id } }),
      prisma.asignacionDocente.count({ where: { periodo_id: periodo.id, activo: true } }),
    ]);
  }

  // Asistencia docente de hoy (fecha local del servidor → ISO date string)
  const hoyStr  = new Date().toISOString().split('T')[0];
  const fechaHoy = new Date(hoyStr);

  const asistenciasHoy = await prisma.asistenciaDocente.groupBy({
    by:    ['estado'],
    where: { fecha: fechaHoy },
    _count: { _all: true },
  });

  let presentes = 0, tardanzas = 0, faltas = 0, justificados = 0;
  for (const row of asistenciasHoy) {
    if      (row.estado === 'P') presentes    = row._count._all;
    else if (row.estado === 'T') tardanzas    = row._count._all;
    else if (row.estado === 'F') faltas       = row._count._all;
    else if (row.estado === 'J') justificados = row._count._all;
  }
  const totalRegistrados = presentes + tardanzas + faltas + justificados;

  return ok(
    {
      periodo: periodo
        ? { id: periodo.id, nombre: periodo.nombre, anio: periodo.anio, activo: periodo.activo }
        : null,
      alumnos: {
        total:     alumnosActivos,
        bloqueados: alumnosBloqueados,
      },
      docentes: {
        total: docentesActivos,
      },
      asistencia_hoy: {
        presentes,
        tardanzas,
        faltas,
        justificados,
        sin_registrar:  Math.max(0, docentesActivos - totalRegistrados),
        total_docentes: docentesActivos,
      },
      bimestres: {
        total:    bimestresTotal,
        cerrados: bimestresCerrados,
        abiertos: bimestresTotal - bimestresCerrados,
      },
      secciones,
      asignaciones,
    },
    'Estadísticas del sistema',
  );
});
