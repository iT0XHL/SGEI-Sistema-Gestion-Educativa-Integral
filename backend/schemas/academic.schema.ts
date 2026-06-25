// ============================================================
//  schemas/academic.schema.ts — Validación Zod de la estructura
//  académica (institución, períodos, bimestres, escala, niveles,
//  grados, secciones, cursos, competencias, asignaciones, horarios).
//  Longitudes y CHECKs alineados con el DDL v2.1.
// ============================================================
import { z } from 'zod';

const uuid = z.string().uuid('Identificador inválido');
const horaHHMM = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (formato HH:MM)');

// ── Institución educativa ─────────────────────────────────────
export const UpdateInstitucionSchema = z.object({
  nombre: z.string().trim().min(3).max(200),
  codigo_modular: z
    .string()
    .trim()
    .regex(/^\d{7}$/, 'El código modular debe tener 7 dígitos')
    .max(20),
  codigo_ugel: z.string().trim().min(1).max(10),
  nombre_ugel: z.string().trim().min(1).max(150),
  resolucion_creacion: z.string().trim().max(100).optional().nullable(),
  modalidad: z.string().trim().max(80).default('Educación Básica Regular'),
  gestion: z.enum(['Publica', 'Privada']),
  departamento: z.string().trim().min(1).max(80),
  provincia: z.string().trim().min(1).max(80),
  distrito: z.string().trim().min(1).max(80),
  centro_poblado: z.string().trim().max(100).optional().nullable(),
  direccion: z.string().trim().max(255).optional().nullable(),
  telefono: z.string().trim().max(15).optional().nullable(),
  email_institucional: z.string().trim().email().max(150).optional().nullable(),
});
export type UpdateInstitucionInput = z.infer<typeof UpdateInstitucionSchema>;

// ── Período académico ─────────────────────────────────────────
export const CreatePeriodoSchema = z
  .object({
    anio: z.coerce.number().int().gt(2000, 'Año inválido'),
    nombre: z.string().trim().min(1).max(60),
    fecha_inicio: z.coerce.date(),
    fecha_fin: z.coerce.date(),
    activo: z.boolean().default(false),
  })
  .refine((d) => d.fecha_fin > d.fecha_inicio, {
    message: 'fecha_fin debe ser posterior a fecha_inicio',
    path: ['fecha_fin'],
  });
export type CreatePeriodoInput = z.infer<typeof CreatePeriodoSchema>;

// ── Bimestre ──────────────────────────────────────────────────
export const CreateBimestreSchema = z
  .object({
    periodo_id: uuid,
    numero: z.coerce.number().int().min(1).max(4),
    nombre: z.string().trim().min(1).max(40),
    fecha_inicio: z.coerce.date(),
    fecha_fin: z.coerce.date(),
  })
  .refine((d) => d.fecha_fin > d.fecha_inicio, {
    message: 'fecha_fin debe ser posterior a fecha_inicio',
    path: ['fecha_fin'],
  });
export type CreateBimestreInput = z.infer<typeof CreateBimestreSchema>;

export const UpdateBimestreSchema = z.object({
  nombre: z.string().trim().min(1).max(40).optional(),
  fecha_inicio: z.coerce.date().optional(),
  fecha_fin: z.coerce.date().optional(),
});
export type UpdateBimestreInput = z.infer<typeof UpdateBimestreSchema>;

// ── Escala literal (config_escala_literal) ────────────────────
// Debe cubrir EXACTAMENTE 0–20 sin huecos ni superposiciones.
export const UpsertEscalaSchema = z
  .object({
    periodo_id: uuid,
    escalas: z
      .array(
        z.object({
          escala: z.enum(['AD', 'A', 'B', 'C']),
          rango_inferior: z.coerce.number().min(0).max(20),
          rango_superior: z.coerce.number().min(0).max(20),
          descripcion: z.string().trim().max(200).optional().nullable(),
        }),
      )
      .length(4, 'Se requieren exactamente 4 escalas: AD, A, B, C'),
  })
  .refine(
    (d) => {
      const escalas = new Set(d.escalas.map((e) => e.escala));
      return escalas.size === 4;
    },
    { message: 'Las escalas deben ser AD, A, B y C sin repetir', path: ['escalas'] },
  )
  .refine(
    (d) => d.escalas.every((e) => e.rango_superior > e.rango_inferior),
    { message: 'rango_superior debe ser mayor que rango_inferior', path: ['escalas'] },
  )
  .refine(
    (d) => {
      const ordenadas = [...d.escalas].sort(
        (a, b) => a.rango_inferior - b.rango_inferior,
      );
      let cursor = 0;
      for (const e of ordenadas) {
        if (Math.abs(e.rango_inferior - cursor) > 0.001) return false;
        cursor = e.rango_superior;
      }
      return Math.abs(cursor - 20) < 0.001;
    },
    {
      message: 'La escala debe cubrir el rango 0–20 sin huecos ni superposiciones',
      path: ['escalas'],
    },
  );
export type UpsertEscalaInput = z.infer<typeof UpsertEscalaSchema>;

// ── Nivel y grado ─────────────────────────────────────────────
// Nombre libre (máx. 30, alineado con VarChar(30)) para permitir crear
// cualquier nivel más adelante (p. ej. "Inicial") sin tocar el código.
export const CreateNivelSchema = z.object({
  nombre: z.string().trim().min(3, 'Mínimo 3 caracteres').max(30),
  descripcion: z.string().trim().max(255).optional().nullable(),
});
export type CreateNivelInput = z.infer<typeof CreateNivelSchema>;

export const UpdateNivelSchema = CreateNivelSchema.partial();
export type UpdateNivelInput = z.infer<typeof UpdateNivelSchema>;

export const CreateGradoSchema = z.object({
  nivel_id: uuid,
  nombre: z.string().trim().min(1).max(30),
  orden: z.coerce.number().int().positive(),
});
export type CreateGradoInput = z.infer<typeof CreateGradoSchema>;

export const UpdateGradoSchema = z.object({
  nombre: z.string().trim().min(1).max(30).optional(),
  orden: z.coerce.number().int().positive().optional(),
});
export type UpdateGradoInput = z.infer<typeof UpdateGradoSchema>;

// Asignación de un curso del catálogo del nivel a un grado concreto.
export const AssignGradoCursoSchema = z.object({
  curso_id: uuid,
});
export type AssignGradoCursoInput = z.infer<typeof AssignGradoCursoSchema>;

// ── Sección ───────────────────────────────────────────────────
export const CreateSeccionSchema = z.object({
  grado_id: uuid,
  periodo_id: uuid,
  nombre: z.string().trim().min(1).max(5),
  turno: z.enum(['Mañana', 'Tarde', 'Noche']).default('Mañana'),
  cupo_maximo: z.coerce.number().int().min(1).max(45),
  docente_tutor_id: uuid.optional().nullable(),
  aula: z.string().trim().max(20).optional().nullable(),
});
export type CreateSeccionInput = z.infer<typeof CreateSeccionSchema>;

export const UpdateSeccionSchema = z.object({
  nombre: z.string().trim().min(1).max(5).optional(),
  turno: z.enum(['Mañana', 'Tarde', 'Noche']).optional(),
  cupo_maximo: z.coerce.number().int().min(1).max(45).optional(),
  docente_tutor_id: uuid.optional().nullable(),
  aula: z.string().trim().max(20).optional().nullable(),
});
export type UpdateSeccionInput = z.infer<typeof UpdateSeccionSchema>;

// ── Curso ─────────────────────────────────────────────────────
export const CreateCursoSchema = z.object({
  nivel_id: uuid,
  nombre: z.string().trim().min(1).max(120),
  codigo_cneb: z.string().trim().max(20).optional().nullable(),
  descripcion: z.string().trim().optional().nullable(),
  horas_semanales: z.coerce.number().int().positive().optional().nullable(),
});
export type CreateCursoInput = z.infer<typeof CreateCursoSchema>;

export const UpdateCursoSchema = CreateCursoSchema.partial();
export type UpdateCursoInput = z.infer<typeof UpdateCursoSchema>;

// ── Competencia ───────────────────────────────────────────────
export const CreateCompetenciaSchema = z.object({
  curso_id: uuid,
  nombre: z.string().trim().min(1).max(200),
  descripcion: z.string().trim().optional().nullable(),
  tipo: z.enum(['regular', 'transversal']),
  orden: z.coerce.number().int().positive().optional().nullable(),
});
export type CreateCompetenciaInput = z.infer<typeof CreateCompetenciaSchema>;

export const UpdateCompetenciaSchema = CreateCompetenciaSchema.partial().omit({
  curso_id: true,
});
export type UpdateCompetenciaInput = z.infer<typeof UpdateCompetenciaSchema>;

export const ReordenarCompetenciasSchema = z.object({
  competencias: z
    .array(z.object({ id: uuid, orden: z.coerce.number().int().positive() }))
    .min(1),
});
export type ReordenarCompetenciasInput = z.infer<typeof ReordenarCompetenciasSchema>;

// ── Asignación docente ────────────────────────────────────────
export const CreateAsignacionSchema = z.object({
  docente_id: uuid,
  curso_id: uuid,
  seccion_id: uuid,
  periodo_id: uuid,
});
export type CreateAsignacionInput = z.infer<typeof CreateAsignacionSchema>;

// ── Horario ───────────────────────────────────────────────────
export const CreateHorarioSchema = z
  .object({
    asignacion_id: uuid,
    dia_semana: z.coerce.number().int().min(1).max(6),
    hora_inicio: horaHHMM,
    hora_fin: horaHHMM,
    aula: z.string().trim().max(20).optional().nullable(),
  })
  .refine((d) => d.hora_fin > d.hora_inicio, {
    message: 'hora_fin debe ser mayor que hora_inicio',
    path: ['hora_fin'],
  });
export type CreateHorarioInput = z.infer<typeof CreateHorarioSchema>;

export const UpdateHorarioSchema = z
  .object({
    dia_semana: z.coerce.number().int().min(1).max(6).optional(),
    hora_inicio: horaHHMM.optional(),
    hora_fin: horaHHMM.optional(),
    aula: z.string().trim().max(20).optional().nullable(),
  })
  .refine(
    (d) => {
      if (d.hora_inicio && d.hora_fin) return d.hora_fin > d.hora_inicio;
      return true;
    },
    { message: 'hora_fin debe ser mayor que hora_inicio', path: ['hora_fin'] }
  );
export type UpdateHorarioInput = z.infer<typeof UpdateHorarioSchema>;

// ── Query params reutilizables ────────────────────────────────
export const PeriodoIdQuery = z.object({ periodoId: uuid.optional() });
export const BimestresQuery = z.object({ periodoId: uuid.optional() });
export const NivelIdQuery = z.object({ nivelId: uuid.optional() });
export const SeccionesQuery = z.object({
  periodoId: uuid.optional(),
  gradoId: uuid.optional(),
});
export const CompetenciasQuery = z.object({ cursoId: uuid.optional() });
export const AsignacionesQuery = z.object({
  periodoId: uuid.optional(),
  seccionId: uuid.optional(),
  docenteId: uuid.optional(),
});
export const HorariosQuery = z.object({
  periodoId: uuid.optional(),
  seccionId: uuid.optional(),
});
