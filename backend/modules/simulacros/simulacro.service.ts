// ============================================================
//  modules/simulacros/simulacro.service.ts
//  Lógica del módulo Simulacro de Admisión.
//  · El docente sube su bloque de 5 preguntas por (curso, grado) que enseña,
//    SOLO cuando hay un simulacro ACTIVO. La activación la hace Admin o Docente.
//  · El Admin cura (elige 5 del banco por curso) y arma el examen por grado.
//  · El examen guarda un SNAPSHOT (documento inmutable, listo para imprimir).
// ============================================================
import { prisma } from '@/lib/prisma';
import { NotFoundError, ConflictError, BusinessRuleError } from '@/errors/http-errors';
import { SimulacroRepo, PreguntaRepo, ExamenRepo, CargaRepo } from './simulacro.repository';
import { NotificacionService } from '@/modules/notificaciones/notificacion.service';
import { NotificationEvents } from '@/modules/notificaciones/notificacion.events';
import type { JwtClaims } from '@/lib/jwt';
import type { CreateSimulacroInput, GuardarPreguntasInput, GuardarExamenInput } from '@/schemas/simulacro.schema';

const MAX_SIMULACROS = 4;

/** Período académico activo (configuración global, independiente del rol). */
async function getPeriodoActivo() {
  const periodo = await prisma.periodoAcademico.findFirst({
    where: { activo: true },
    orderBy: { anio: 'desc' },
  });
  if (!periodo) throw new BusinessRuleError('NO_PERIODO_ACTIVO', 'No hay un período académico activo configurado.');
  return periodo;
}

export const SimulacroService = {
  // ── Admin ───────────────────────────────────────────────────
  async list(periodoId?: string) {
    const pid = periodoId ?? (await getPeriodoActivo()).id;
    return SimulacroRepo.list(pid);
  },

  async create(input: CreateSimulacroInput, userId: string) {
    const periodo = input.periodo_id
      ? await prisma.periodoAcademico.findUnique({ where: { id: input.periodo_id } })
      : await getPeriodoActivo();
    if (!periodo) throw new NotFoundError('Período académico');

    const total = await SimulacroRepo.countByPeriodo(periodo.id);
    if (total >= MAX_SIMULACROS) {
      throw new BusinessRuleError('MAX_SIMULACROS', `Solo se permiten ${MAX_SIMULACROS} simulacros por período.`);
    }

    if (input.bimestre_id) {
      const bim = await prisma.bimestre.findUnique({ where: { id: input.bimestre_id } });
      if (!bim || bim.periodo_id !== periodo.id) {
        throw new ConflictError('El bimestre no pertenece al período seleccionado.');
      }
    }

    return SimulacroRepo.create({
      periodo_id: periodo.id,
      bimestre_id: input.bimestre_id ?? null,
      numero: input.numero,
      nombre: input.nombre,
      estado: 'Borrador',
      created_by: userId,
    });
  },

  async cambiarEstado(id: string, estado: 'Borrador' | 'Activo' | 'Concluido', user: JwtClaims) {
    const sim = await SimulacroRepo.findById(id);
    if (!sim) throw new NotFoundError('Simulacro');

    if (estado === 'Activo') {
      const activo = await SimulacroRepo.findActivo(sim.periodo_id);
      if (activo && activo.id !== id) {
        throw new ConflictError(
          `Ya hay un simulacro activo («${activo.nombre}»). Conclúyelo antes de activar otro.`,
        );
      }
    }
    const actualizado = await SimulacroRepo.updateEstado(id, estado);

    if (estado === 'Activo') {
      await NotificacionService.notificarEvento({
        evento: NotificationEvents.SIMULACRO_PROGRAMADO,
        actor:  { perfilId: user.perfilId, rol: user.rol, nombre: user.nombre },
        contexto: { simulacroId: id, simulacroNombre: sim.nombre },
      });
    }

    return actualizado;
  },

  // ── Docente / global ────────────────────────────────────────
  /** Simulacro activo del período activo (o null si no hay). */
  async getActivo() {
    const periodo = await prisma.periodoAcademico.findFirst({ where: { activo: true }, orderBy: { anio: 'desc' } });
    if (!periodo) return null;
    return SimulacroRepo.findActivo(periodo.id);
  },

  /**
   * Carga del docente: árbol Nivel▸Grado▸Sección▸Curso a partir de sus
   * asignaciones del período activo. Incluye el simulacro activo (o null).
   */
  async getCargaDocente(docenteId: string) {
    const periodo = await getPeriodoActivo();
    const simulacro = await SimulacroRepo.findActivo(periodo.id);
    // Si no hay uno activo, se ofrece el próximo Borrador para que el docente lo active.
    const proximoSimulacro = simulacro ? null : await SimulacroRepo.findPendiente(periodo.id);
    const asignaciones = await CargaRepo.listAsignaciones(docenteId, periodo.id);

    // Cursos y grados que enseña el docente (la asignatura y el grado que lleva).
    const cursosMap = new Map<string, { id: string; nombre: string }>();
    const gradosMap = new Map<string, { id: string; nombre: string; orden: number; nivel: { id: string; nombre: string } }>();
    for (const a of asignaciones) {
      cursosMap.set(a.curso.id, { id: a.curso.id, nombre: a.curso.nombre });
      const g = a.seccion.grado;
      gradosMap.set(g.id, { id: g.id, nombre: g.nombre, orden: g.orden, nivel: g.nivel });
    }

    return {
      simulacro,
      proximoSimulacro,
      periodo: { id: periodo.id, nombre: periodo.nombre },
      cursos: Array.from(cursosMap.values()),
      grados: Array.from(gradosMap.values()).sort((a, b) => a.orden - b.orden),
    };
  },

  /** Preguntas ya guardadas por el docente para el simulacro activo (para editar). */
  async getPreguntasDocente(docenteId: string, filters: { cursoId?: string; gradoId?: string; seccionId?: string }) {
    const sim = await this.getActivo();
    if (!sim) return [];
    return PreguntaRepo.listByDocente(sim.id, docenteId, filters);
  },

  /**
   * Guarda (reemplaza) el bloque de 5 preguntas del docente para curso+grado.
   * Requiere un simulacro ACTIVO y que el docente dicte ese curso en ese grado.
   */
  async guardarPreguntas(docenteId: string, input: GuardarPreguntasInput) {
    const periodo = await getPeriodoActivo();
    const sim = await SimulacroRepo.findActivo(periodo.id);
    if (!sim) {
      throw new BusinessRuleError('SIN_SIMULACRO_ACTIVO', 'No hay un simulacro activo. Actívalo para subir tus preguntas.');
    }

    // El docente debe dictar ese curso en ese grado durante el período.
    const dicta = await prisma.asignacionDocente.count({
      where: {
        docente_id: docenteId,
        curso_id: input.curso_id,
        periodo_id: periodo.id,
        activo: true,
        seccion: { grado_id: input.grado_id },
      },
    });
    if (dicta === 0) {
      throw new ConflictError('No tienes asignado ese curso en ese grado para el período activo.');
    }

    return PreguntaRepo.replaceBlock({
      simulacroId: sim.id,
      docenteId,
      cursoId: input.curso_id,
      gradoId: input.grado_id,
      seccionId: input.seccion_id ?? null,
      preguntas: input.preguntas.map((p) => ({
        enunciado: p.enunciado,
        imagen_url: p.imagen_url ?? null,
        alt_a: p.alt_a, alt_b: p.alt_b, alt_c: p.alt_c, alt_d: p.alt_d, alt_e: p.alt_e,
        respuesta_correcta: p.respuesta_correcta,
      })),
    });
  },

  // ── Curaduría (Admin) ───────────────────────────────────────
  async curaduria(simulacroId: string, filters: { nivelId?: string; gradoId?: string; seccionId?: string; cursoId?: string }) {
    const sim = await SimulacroRepo.findById(simulacroId);
    if (!sim) throw new NotFoundError('Simulacro');
    return PreguntaRepo.listCuraduria(simulacroId, filters);
  },

  /** Examen oficial ya armado para un grado (cursos ordenados + sus 5 preguntas). */
  async getExamen(simulacroId: string, gradoId: string) {
    const sim = await SimulacroRepo.findById(simulacroId);
    if (!sim) throw new NotFoundError('Simulacro');
    return ExamenRepo.getByGrado(simulacroId, gradoId);
  },

  /**
   * Arma/reemplaza el examen oficial de un grado. Valida que cada curso
   * tenga exactamente 5 preguntas y que pertenezcan al banco del grado/curso.
   */
  async guardarExamen(simulacroId: string, input: GuardarExamenInput) {
    const sim = await SimulacroRepo.findById(simulacroId);
    if (!sim) throw new NotFoundError('Simulacro');

    // Órdenes de curso no repetidos
    const ordenes = input.cursos.map((c) => c.orden);
    if (new Set(ordenes).size !== ordenes.length) {
      throw new ConflictError('El orden de los cursos no puede repetirse.');
    }

    // Validar que cada bloque de 5 pertenezca al banco (grado+curso) y sin repetidos
    for (const c of input.cursos) {
      if (new Set(c.pregunta_ids).size !== 5) {
        throw new ConflictError('Cada curso debe tener 5 preguntas distintas.');
      }
      const validas = await ExamenRepo.preguntasValidas(simulacroId, input.grado_id, c.curso_id, c.pregunta_ids);
      if (validas.length !== 5) {
        throw new ConflictError('Alguna pregunta seleccionada no pertenece a ese curso/grado del simulacro.');
      }
    }

    await ExamenRepo.replaceExamenGrado(simulacroId, input.grado_id, input.cursos);
    return ExamenRepo.getByGrado(simulacroId, input.grado_id);
  },

  /**
   * Estructura del examen de un grado lista para el PDF, con numeración
   * global continua según el orden de cursos (curso 1 → 1..5, curso 2 → 6..10).
   * Lee del SNAPSHOT del examen (no del banco), así el documento es inmutable.
   */
  async getExamenPdfData(simulacroId: string, gradoId: string) {
    const sim = await SimulacroRepo.findById(simulacroId);
    if (!sim) throw new NotFoundError('Simulacro');
    const grado = await prisma.grado.findUnique({ where: { id: gradoId }, include: { nivel: true } });
    if (!grado) throw new NotFoundError('Grado');

    const examen = await ExamenRepo.getByGrado(simulacroId, gradoId);
    if (examen.length === 0) {
      throw new BusinessRuleError('EXAMEN_VACIO', 'El examen de este grado aún no tiene cursos con preguntas.');
    }

    let n = 1;
    const cursos = examen.map((ex) => ({
      nombre: ex.curso.nombre,
      orden: ex.orden,
      desde: n,
      preguntas: ex.preguntas.map((ep) => ({
        numero:     n++,
        enunciado:  ep.enunciado ?? '',
        imagen_url: ep.imagen_url,
        alternativas: [
          ep.alt_a ?? '', ep.alt_b ?? '', ep.alt_c ?? '', ep.alt_d ?? '', ep.alt_e ?? '',
        ],
        respuesta:  ep.respuesta_correcta ?? '',
      })),
      hasta: 0, // se completa abajo
    }));
    cursos.forEach((c) => { c.hasta = c.desde + c.preguntas.length - 1; });

    return {
      simulacro: sim.nombre,
      nivel: grado.nivel.nombre,
      grado: grado.nombre,
      total: n - 1,
      cursos,
    };
  },
};

export type ExamenPdfData = Awaited<ReturnType<typeof SimulacroService.getExamenPdfData>>;
