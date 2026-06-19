// ============================================================
//  lib/response.ts — Helpers de respuesta estándar de la API.
//  Garantizan el contrato obligatorio { success, data | error }.
// ============================================================
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '@/errors/http-errors';
import type { ApiError, ApiSuccess, PageMeta, Paginated } from '@/types/api';

/** Respuesta de éxito: { success: true, data, message }. */
export function ok<T>(
  data: T,
  message = 'OK',
  statusCode = 200,
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data, message }, { status: statusCode });
}

/** Respuesta de éxito para creación de recursos (201). */
export function created<T>(data: T, message = 'Recurso creado'): NextResponse<ApiSuccess<T>> {
  return ok(data, message, 201);
}

/** Empaqueta un listado con metadatos de paginación. */
export function paginate<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
): Paginated<T> {
  const meta: PageMeta = {
    page,
    limit,
    total,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
  return { items, meta };
}

function buildError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ApiError> {
  return NextResponse.json(
    { success: false, error: { code, message, details } },
    { status },
  );
}

/** Extrae el mensaje legible de un RAISE EXCEPTION de PostgreSQL (P0001),
 *  que Prisma envuelve en un ConnectorError verboso. */
function extractPgMessage(raw: string): string {
  const m = raw.match(/message:\s*"((?:[^"\\]|\\.)*)"/);
  return m ? m[1].replace(/\\"/g, '"') : raw;
}

/** Mapea un mensaje de RAISE EXCEPTION (trigger/SP) a un error de negocio 4xx.
 *  Devuelve null si el mensaje no corresponde a una regla conocida. */
function mapSqlRaise(rawMsg: string): NextResponse<ApiError> | null {
  const msg = extractPgMessage(rawMsg);
  if (msg.includes('cruce de horario')) return buildError('SCHEDULE_CONFLICT', msg, 422);
  if (msg.includes('está cerrada') || msg.includes('bimestre')) return buildError('NOTA_CERRADA', msg, 422);
  if (msg.includes('Acceso denegado')) return buildError('FORBIDDEN', msg, 403);
  if (msg.includes('escala literal') || msg.includes('observación de rechazo')) return buildError('BUSINESS_RULE', msg, 422);
  return null;
}

/**
 * Traduce cualquier excepción a la respuesta de error estándar.
 * Reconoce: AppError, ZodError, errores conocidos de Prisma y los
 * RAISE EXCEPTION de los triggers/SP de PostgreSQL.
 */
export function errorResponse(error: unknown): NextResponse<ApiError> {
  // 1. Errores de aplicación tipados.
  if (error instanceof AppError) {
    return buildError(error.code, error.message, error.statusCode, error.details);
  }

  // 2. Validación Zod.
  if (error instanceof ZodError) {
    return buildError(
      'VALIDATION_ERROR',
      'Los datos enviados no son válidos',
      400,
      error.flatten().fieldErrors,
    );
  }

  // 3. Errores conocidos de Prisma.
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return buildError(
        'CONFLICT',
        'Ya existe un registro con un valor único duplicado',
        409,
        { campos: error.meta?.target },
      );
    }
    if (error.code === 'P2025') {
      return buildError('NOT_FOUND', 'Registro no encontrado', 404);
    }
    if (error.code === 'P2003') {
      return buildError(
        'CONFLICT',
        'Violación de llave foránea: referencia inexistente o en uso',
        409,
      );
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error('[SGEI DB] No se pudo conectar a la base de datos:', error.message);
    return buildError('DB_UNAVAILABLE', 'Base de datos no disponible. Intenta de nuevo.', 503);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error('[SGEI DB] Error de validación Prisma:', error.message);
    const msg = process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor';
    return buildError('PRISMA_VALIDATION', msg, 500);
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    // Los RAISE EXCEPTION (P0001) de triggers/SP llegan aquí: primero se intenta
    // mapearlos a una regla de negocio 4xx antes de caer en el 500 genérico.
    const mapped = mapSqlRaise(error.message);
    if (mapped) return mapped;
    console.error('[SGEI DB] Error Prisma desconocido:', error.message);
    const msg = process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor';
    return buildError('DB_ERROR', msg, 500);
  }

  // 4. RAISE EXCEPTION desde triggers / stored procedures de la DB.
  if (error instanceof Error) {
    const mapped = mapSqlRaise(error.message);
    if (mapped) return mapped;
  }

  // 5. Fallback — error interno no previsto.
  console.error('[SGEI Error]', error);
  return buildError('INTERNAL_ERROR', 'Error interno del servidor', 500);
}
