// ============================================================
//  modules/academic/estructura.service.ts
//  Institución, niveles, grados, secciones, cursos y competencias.
// ============================================================
import { NotFoundError, ConflictError } from '@/errors/http-errors';
import {
  InstitucionRepo,
  NivelRepo,
  GradoRepo,
  SeccionRepo,
  CursoRepo,
  GradoCursoRepo,
  CompetenciaRepo,
  AreaAcademicaRepo,
} from './academic.repository';
import type {
  UpdateInstitucionInput,
  CreateNivelInput,
  UpdateNivelInput,
  CreateGradoInput,
  UpdateGradoInput,
  CreateSeccionInput,
  UpdateSeccionInput,
  CreateCursoInput,
  UpdateCursoInput,
  CreateCompetenciaInput,
  UpdateCompetenciaInput,
  ReordenarCompetenciasInput,
  CreateAreaAcademicaInput,
  UpdateAreaAcademicaInput,
} from '@/schemas/academic.schema';

// ── Institución educativa ─────────────────────────────────────
export const InstitucionService = {
  async get() {
    const ie = await InstitucionRepo.getActiva();
    if (!ie) throw new NotFoundError('Institución educativa');
    return ie;
  },
  async update(id: string, input: UpdateInstitucionInput) {
    const ie = await InstitucionRepo.findById(id);
    if (!ie) throw new NotFoundError('Institución educativa');
    return InstitucionRepo.update(id, input);
  },
};

// ── Niveles ───────────────────────────────────────────────────
export const NivelService = {
  list() {
    return NivelRepo.list();
  },
  create(input: CreateNivelInput) {
    return NivelRepo.create({
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
    });
  },
  async update(id: string, input: UpdateNivelInput) {
    const nivel = await NivelRepo.findById(id);
    if (!nivel) throw new NotFoundError('Nivel');
    return NivelRepo.update(id, {
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      ...(input.descripcion !== undefined ? { descripcion: input.descripcion } : {}),
    });
  },
  async remove(id: string) {
    const nivel = await NivelRepo.findById(id);
    if (!nivel) throw new NotFoundError('Nivel');
    const [grados, cursos] = await NivelRepo.countDeps(id);
    if (grados > 0 || cursos > 0) {
      throw new ConflictError(
        `No se puede eliminar el nivel: tiene ${grados} grado(s) y ${cursos} curso(s) asociados.`,
      );
    }
    await NivelRepo.delete(id);
    return { id, eliminado: true };
  },
};

// ── Grados ────────────────────────────────────────────────────
export const GradoService = {
  list(nivelId?: string) {
    return GradoRepo.list(nivelId);
  },
  async create(input: CreateGradoInput) {
    const nivel = await NivelRepo.findById(input.nivel_id);
    if (!nivel) throw new NotFoundError('Nivel');
    const grado = await GradoRepo.create({
      nivel_id: input.nivel_id,
      nombre: input.nombre,
      orden: input.orden,
    });
    // Predeterminado: el grado hereda los cursos del nivel; luego se editan.
    // No es crítico: si fallara, el grado queda creado y se puede reaplicar.
    try {
      await GradoCursoRepo.addNivelDefaults(grado.id, input.nivel_id);
    } catch {
      /* el grado se crea igualmente; el admin puede aplicar predeterminados */
    }
    return grado;
  },
  async update(id: string, input: UpdateGradoInput) {
    const grado = await GradoRepo.findById(id);
    if (!grado) throw new NotFoundError('Grado');
    return GradoRepo.update(id, {
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      ...(input.orden !== undefined ? { orden: input.orden } : {}),
    });
  },
  async remove(id: string) {
    const grado = await GradoRepo.findById(id);
    if (!grado) throw new NotFoundError('Grado');
    const secciones = await GradoRepo.countSecciones(id);
    if (secciones > 0) {
      throw new ConflictError(
        `No se puede eliminar el grado: tiene ${secciones} sección(es) asociada(s).`,
      );
    }
    // Las filas de grado_curso se eliminan en cascada (ON DELETE CASCADE).
    await GradoRepo.delete(id);
    return { id, eliminado: true };
  },
};

// ── Cursos por grado (grado_curso) ────────────────────────────
export const GradoCursoService = {
  async list(gradoId: string) {
    const grado = await GradoRepo.findById(gradoId);
    if (!grado) throw new NotFoundError('Grado');
    const rows = await GradoCursoRepo.listByGrado(gradoId);
    return rows.map((r) => r.curso);
  },
  async assign(gradoId: string, cursoId: string) {
    const grado = await GradoRepo.findById(gradoId);
    if (!grado) throw new NotFoundError('Grado');
    const curso = await CursoRepo.findById(cursoId);
    if (!curso) throw new NotFoundError('Curso');
    if (curso.nivel_id !== grado.nivel_id) {
      throw new ConflictError('El curso pertenece a otro nivel distinto al del grado.');
    }
    await GradoCursoRepo.add(gradoId, cursoId);
    return this.list(gradoId);
  },
  async unassign(gradoId: string, cursoId: string) {
    const grado = await GradoRepo.findById(gradoId);
    if (!grado) throw new NotFoundError('Grado');
    await GradoCursoRepo.remove(gradoId, cursoId);
    return this.list(gradoId);
  },
  async applyNivelDefaults(gradoId: string) {
    const grado = await GradoRepo.findById(gradoId);
    if (!grado) throw new NotFoundError('Grado');
    await GradoCursoRepo.addNivelDefaults(gradoId, grado.nivel_id);
    return this.list(gradoId);
  },
};

// ── Secciones ─────────────────────────────────────────────────
export const SeccionService = {
  list(filters: { periodoId?: string; gradoId?: string }) {
    return SeccionRepo.list(filters);
  },
  async create(input: CreateSeccionInput) {
    const grado = await GradoRepo.findById(input.grado_id);
    if (!grado) throw new NotFoundError('Grado');
    return SeccionRepo.create({
      grado_id: input.grado_id,
      periodo_id: input.periodo_id,
      nombre: input.nombre,
      turno: input.turno,
      cupo_maximo: input.cupo_maximo,
      docente_tutor_id: input.docente_tutor_id ?? null,
      aula: input.aula ?? null,
    });
  },
  async update(id: string, input: UpdateSeccionInput) {
    const seccion = await SeccionRepo.findById(id);
    if (!seccion) throw new NotFoundError('Sección');
    return SeccionRepo.update(id, {
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      ...(input.turno !== undefined ? { turno: input.turno } : {}),
      ...(input.cupo_maximo !== undefined ? { cupo_maximo: input.cupo_maximo } : {}),
      ...(input.aula !== undefined ? { aula: input.aula } : {}),
      ...(input.docente_tutor_id !== undefined
        ? {
            docente_tutor: input.docente_tutor_id
              ? { connect: { id: input.docente_tutor_id } }
              : { disconnect: true },
          }
        : {}),
    });
  },
  async remove(id: string) {
    const seccion = await SeccionRepo.findById(id);
    if (!seccion) throw new NotFoundError('Sección');
    const [alumnos, asignaciones] = await SeccionRepo.countDeps(id);
    if (alumnos > 0 || asignaciones > 0) {
      throw new ConflictError(
        `No se puede eliminar la sección: tiene ${alumnos} alumno(s) y ${asignaciones} asignación(es).`,
      );
    }
    await SeccionRepo.delete(id);
    return { id, eliminado: true };
  },
};

// ── Cursos ────────────────────────────────────────────────────
export const CursoService = {
  list(nivelId?: string) {
    return CursoRepo.list(nivelId);
  },
  async create(input: CreateCursoInput) {
    const nivel = await NivelRepo.findById(input.nivel_id);
    if (!nivel) throw new NotFoundError('Nivel');
    return CursoRepo.create({
      nivel_id: input.nivel_id,
      nombre: input.nombre,
      codigo_cneb: input.codigo_cneb ?? null,
      descripcion: input.descripcion ?? null,
      horas_semanales: input.horas_semanales ?? null,
      area_academica_id: input.area_academica_id ?? null,
    });
  },
  async update(id: string, input: UpdateCursoInput) {
    const curso = await CursoRepo.findById(id);
    if (!curso) throw new NotFoundError('Curso');
    return CursoRepo.update(id, input);
  },
  async remove(id: string) {
    const curso = await CursoRepo.findById(id);
    if (!curso) throw new NotFoundError('Curso');
    const [asignaciones, competencias] = await CursoRepo.countDeps(id);
    if (asignaciones > 0 || competencias > 0) {
      throw new ConflictError(
        `No se puede eliminar el curso: tiene ${asignaciones} asignación(es) y ${competencias} competencia(s).`,
      );
    }
    // Las filas de grado_curso se eliminan en cascada (ON DELETE CASCADE).
    await CursoRepo.delete(id);
    return { id, eliminado: true };
  },
};

// ── Competencias ──────────────────────────────────────────────
export const CompetenciaService = {
  list(cursoId?: string, gradoId?: string) {
    return CompetenciaRepo.list(cursoId, gradoId);
  },
  async create(input: CreateCompetenciaInput) {
    const curso = await CursoRepo.findById(input.curso_id);
    if (!curso) throw new NotFoundError('Curso');
    if (input.grado_id) {
      const grado = await GradoRepo.findById(input.grado_id);
      if (!grado) throw new NotFoundError('Grado');
    }
    return CompetenciaRepo.create({
      curso_id: input.curso_id,
      grado_id: input.grado_id ?? null,
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      tipo: input.tipo,
      orden: input.orden ?? null,
      peso: input.peso,
    });
  },
  async update(id: string, input: UpdateCompetenciaInput) {
    const competencia = await CompetenciaRepo.findById(id);
    if (!competencia) throw new NotFoundError('Competencia');
    return CompetenciaRepo.update(id, {
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      ...(input.descripcion !== undefined ? { descripcion: input.descripcion } : {}),
      ...(input.tipo !== undefined ? { tipo: input.tipo } : {}),
      ...(input.orden !== undefined ? { orden: input.orden } : {}),
      ...(input.peso !== undefined ? { peso: input.peso } : {}),
    });
  },
  async remove(id: string) {
    const competencia = await CompetenciaRepo.findById(id);
    if (!competencia) throw new NotFoundError('Competencia');
    // Si tiene notas asociadas, la FK ON DELETE RESTRICT lo impedirá
    // y errorResponse lo traducirá a un 409 CONFLICT.
    await CompetenciaRepo.delete(id);
    return { id, eliminado: true };
  },
  async reordenar(input: ReordenarCompetenciasInput) {
    await CompetenciaRepo.reordenar(input.competencias);
    return { actualizadas: input.competencias.length };
  },
  /** Copia las competencias default del nivel como override editable de un grado. */
  async copiarAGrado(cursoId: string, gradoId: string) {
    const curso = await CursoRepo.findById(cursoId);
    if (!curso) throw new NotFoundError('Curso');
    const grado = await GradoRepo.findById(gradoId);
    if (!grado) throw new NotFoundError('Grado');
    await CompetenciaRepo.copiarDefaultsAGrado(cursoId, gradoId);
    return CompetenciaRepo.overridesDeGrado(cursoId, gradoId);
  },
  /** Elimina los overrides de un grado, volviendo a heredar el default del nivel. */
  async restaurarPredeterminado(cursoId: string, gradoId: string) {
    await CompetenciaRepo.restaurarDefaultDeGrado(cursoId, gradoId);
    return { cursoId, gradoId, restaurado: true };
  },
};

// ── Área académica (agrupador visual de libreta) ──────────────
export const AreaAcademicaService = {
  list(nivelId?: string) {
    return AreaAcademicaRepo.list(nivelId);
  },
  async create(input: CreateAreaAcademicaInput) {
    const nivel = await NivelRepo.findById(input.nivel_id);
    if (!nivel) throw new NotFoundError('Nivel');
    return AreaAcademicaRepo.create({
      nivel_id: input.nivel_id,
      nombre: input.nombre,
      orden: input.orden ?? null,
    });
  },
  async update(id: string, input: UpdateAreaAcademicaInput) {
    const area = await AreaAcademicaRepo.findById(id);
    if (!area) throw new NotFoundError('Área académica');
    return AreaAcademicaRepo.update(id, {
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      ...(input.orden !== undefined ? { orden: input.orden } : {}),
    });
  },
  async remove(id: string) {
    const area = await AreaAcademicaRepo.findById(id);
    if (!area) throw new NotFoundError('Área académica');
    const cursos = await AreaAcademicaRepo.countCursos(id);
    if (cursos > 0) {
      throw new ConflictError(
        `No se puede eliminar el área: tiene ${cursos} curso(s) asignado(s). Reasígnalos primero.`,
      );
    }
    await AreaAcademicaRepo.delete(id);
    return { id, eliminado: true };
  },
};
