// ============================================================
//  schemas/simulacro.schema.ts — Validación del módulo
//  Simulacro de Admisión (Fase 1: control + carga docente).
// ============================================================
import { z } from 'zod';

const uuid = z.string().uuid('Identificador inválido');
const letra = z.enum(['A', 'B', 'C', 'D', 'E']);

// ── Admin: crear / cambiar estado ─────────────────────────────
export const CreateSimulacroSchema = z.object({
  // periodo_id opcional: si se omite, el servicio usa el período activo.
  periodo_id:  uuid.optional(),
  bimestre_id: uuid.optional().nullable(),
  numero:      z.coerce.number().int().min(1, 'Mínimo 1').max(4, 'Máximo 4 simulacros'),
  nombre:      z.string().trim().min(1).max(60),
});
export type CreateSimulacroInput = z.infer<typeof CreateSimulacroSchema>;

export const CambiarEstadoSchema = z.object({
  estado: z.enum(['Borrador', 'Activo', 'Concluido']),
});
export type CambiarEstadoInput = z.infer<typeof CambiarEstadoSchema>;

export const ListSimulacrosQuery = z.object({
  periodoId: uuid.optional(),
});

// ── Curaduría (Admin): filtros del banco de preguntas ─────────
export const CuraduriaQuery = z.object({
  nivelId:   uuid.optional(),
  gradoId:   uuid.optional(),
  seccionId: uuid.optional(),
  cursoId:   uuid.optional(),
});

// ── Docente: guardar bloque de 5 preguntas ────────────────────
const PreguntaItemSchema = z.object({
  enunciado:          z.string().trim().min(1, 'El enunciado es obligatorio').max(2000),
  imagen_url:         z.string().trim().url().max(500).optional().nullable(),
  alt_a:              z.string().trim().min(1).max(500),
  alt_b:              z.string().trim().min(1).max(500),
  alt_c:              z.string().trim().min(1).max(500),
  alt_d:              z.string().trim().min(1).max(500),
  alt_e:              z.string().trim().min(1).max(500),
  respuesta_correcta: letra,
});

export const GuardarPreguntasSchema = z.object({
  curso_id:   uuid,
  grado_id:   uuid,
  seccion_id: uuid.optional().nullable(),
  preguntas:  z.array(PreguntaItemSchema).length(5, 'Debes registrar exactamente 5 preguntas'),
});
export type GuardarPreguntasInput = z.infer<typeof GuardarPreguntasSchema>;

export const CargaQuery = z.object({
  cursoId:   uuid.optional(),
  gradoId:   uuid.optional(),
  seccionId: uuid.optional(),
});

// ── Curaduría (Admin): armar el examen oficial de un grado ────
export const ExamenQuery = z.object({
  gradoId: uuid,
});

export const GuardarExamenSchema = z.object({
  grado_id: uuid,
  cursos: z
    .array(
      z.object({
        curso_id:     uuid,
        orden:        z.coerce.number().int().positive(),
        pregunta_ids: z.array(uuid).length(5, 'Cada curso debe tener exactamente 5 preguntas'),
      }),
    )
    .min(1, 'Selecciona al menos un curso'),
});
export type GuardarExamenInput = z.infer<typeof GuardarExamenSchema>;
