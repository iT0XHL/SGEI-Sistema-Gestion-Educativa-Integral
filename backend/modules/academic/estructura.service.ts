// ============================================================
//  modules/academic/estructura.service.ts
//  Institución, niveles, grados, secciones, cursos y competencias.
// ============================================================
import { NotFoundError } from '@/errors/http-errors';
import {
  InstitucionRepo,
  NivelRepo,
  GradoRepo,
  SeccionRepo,
  CursoRepo,
  CompetenciaRepo,
} from './academic.repository';
import type {
  UpdateInstitucionInput,
  CreateNivelInput,
  CreateGradoInput,
  CreateSeccionInput,
  CreateCursoInput,
  UpdateCursoInput,
  CreateCompetenciaInput,
  UpdateCompetenciaInput,
  ReordenarCompetenciasInput,
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
};

// ── Grados ────────────────────────────────────────────────────
export const GradoService = {
  list(nivelId?: string) {
    return GradoRepo.list(nivelId);
  },
  async create(input: CreateGradoInput) {
    const nivel = await NivelRepo.findById(input.nivel_id);
    if (!nivel) throw new NotFoundError('Nivel');
    return GradoRepo.create({
      nivel_id: input.nivel_id,
      nombre: input.nombre,
      orden: input.orden,
    });
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
    });
  },
  async update(id: string, input: UpdateCursoInput) {
    const curso = await CursoRepo.findById(id);
    if (!curso) throw new NotFoundError('Curso');
    return CursoRepo.update(id, input);
  },
};

// ── Competencias ──────────────────────────────────────────────
export const CompetenciaService = {
  list(cursoId?: string) {
    return CompetenciaRepo.list(cursoId);
  },
  async create(input: CreateCompetenciaInput) {
    const curso = await CursoRepo.findById(input.curso_id);
    if (!curso) throw new NotFoundError('Curso');
    return CompetenciaRepo.create({
      curso_id: input.curso_id,
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      tipo: input.tipo,
      orden: input.orden ?? null,
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
};
