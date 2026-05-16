// ============================================================
//  schemas/personas.schema.ts — Validación Zod de docentes y
//  alumnos. Cada uno crea: credencial + perfil_usuario + entidad.
//  Longitudes y CHECKs alineados con el DDL v2.1.
// ============================================================
import { z } from 'zod';

const uuid = z.string().uuid('Identificador inválido');
const dni = z.string().regex(/^\d{8}$/, 'El DNI debe tener exactamente 8 dígitos');
const telefono = z.string().trim().max(15);
const grupoSanguineo = z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

// ── Docente ───────────────────────────────────────────────────
export const CreateDocenteSchema = z.object({
  // Credencial de acceso.
  usuario_login: z.string().trim().email('Correo de acceso inválido').max(50),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128),
  // Datos del docente.
  dni,
  nombres: z.string().trim().min(2).max(100),
  apellido_paterno: z.string().trim().min(2).max(60),
  apellido_materno: z.string().trim().min(2).max(60),
  especialidad: z.string().trim().min(2).max(150),
  telefono,
  email_institucional: z.string().trim().email().max(150).optional().nullable(),
  fecha_nacimiento: z.coerce.date().optional().nullable(),
  sexo: z.enum(['M', 'F']).optional().nullable(),
  titulo_profesional: z.string().trim().max(200).optional().nullable(),
  fecha_ingreso: z.coerce.date().optional().nullable(),
});
export type CreateDocenteInput = z.infer<typeof CreateDocenteSchema>;

export const UpdateDocenteSchema = z.object({
  nombres: z.string().trim().min(2).max(100).optional(),
  apellido_paterno: z.string().trim().min(2).max(60).optional(),
  apellido_materno: z.string().trim().min(2).max(60).optional(),
  especialidad: z.string().trim().min(2).max(150).optional(),
  telefono: telefono.optional(),
  email_institucional: z.string().trim().email().max(150).optional().nullable(),
  fecha_nacimiento: z.coerce.date().optional().nullable(),
  sexo: z.enum(['M', 'F']).optional().nullable(),
  titulo_profesional: z.string().trim().max(200).optional().nullable(),
  fecha_ingreso: z.coerce.date().optional().nullable(),
});
export type UpdateDocenteInput = z.infer<typeof UpdateDocenteSchema>;

export const ListDocentesQuery = z.object({
  q: z.string().trim().max(100).optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListDocentesQuery = z.infer<typeof ListDocentesQuery>;

// ── Alumno ────────────────────────────────────────────────────
export const CreateAlumnoSchema = z.object({
  // Credencial de acceso.
  usuario_login: z.string().trim().email('Correo de acceso inválido').max(50),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128),
  // Ubicación académica.
  seccion_id: uuid,
  periodo_id: uuid,
  // Datos del alumno.
  dni,
  codigo_siagie: z.string().trim().max(20).optional().nullable(),
  nombres: z.string().trim().min(2).max(100),
  apellido_paterno: z.string().trim().min(2).max(60),
  apellido_materno: z.string().trim().min(2).max(60),
  fecha_nacimiento: z.coerce.date(),
  sexo: z.enum(['M', 'F']),
  direccion: z.string().trim().max(255).optional().nullable(),
  distrito: z.string().trim().max(100).optional().nullable(),
  telefono_emergencia: telefono.optional().nullable(),
  grupo_sanguineo: grupoSanguineo.optional().nullable(),
  condicion_especial: z.string().trim().optional().nullable(),
});
export type CreateAlumnoInput = z.infer<typeof CreateAlumnoSchema>;

export const UpdateAlumnoSchema = z.object({
  seccion_id: uuid.optional(),
  codigo_siagie: z.string().trim().max(20).optional().nullable(),
  nombres: z.string().trim().min(2).max(100).optional(),
  apellido_paterno: z.string().trim().min(2).max(60).optional(),
  apellido_materno: z.string().trim().min(2).max(60).optional(),
  fecha_nacimiento: z.coerce.date().optional(),
  sexo: z.enum(['M', 'F']).optional(),
  direccion: z.string().trim().max(255).optional().nullable(),
  distrito: z.string().trim().max(100).optional().nullable(),
  telefono_emergencia: telefono.optional().nullable(),
  grupo_sanguineo: grupoSanguineo.optional().nullable(),
  condicion_especial: z.string().trim().optional().nullable(),
});
export type UpdateAlumnoInput = z.infer<typeof UpdateAlumnoSchema>;

export const BloqueoLibretaSchema = z.object({
  bloqueo_manual: z.boolean(),
});
export type BloqueoLibretaInput = z.infer<typeof BloqueoLibretaSchema>;

export const ListAlumnosQuery = z.object({
  q: z.string().trim().max(100).optional(),
  nivelId: uuid.optional(),
  gradoId: uuid.optional(),
  seccionId: uuid.optional(),
  periodoId: uuid.optional(),
  activo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ListAlumnosQuery = z.infer<typeof ListAlumnosQuery>;
