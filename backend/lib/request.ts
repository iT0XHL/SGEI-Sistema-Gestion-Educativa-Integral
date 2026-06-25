// ============================================================
//  lib/request.ts — Utilidades para leer Route Handlers.
// ============================================================
import { NextRequest } from 'next/server';
import { ValidationError } from '@/errors/http-errors';
import type { z } from 'zod';

/** Parsea el body JSON y lo valida con un esquema Zod. */
export async function parseBody<T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ValidationError({ body: ['El cuerpo de la petición no es JSON válido'] });
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors);
  }
  return result.data;
}

/** Valida los query params (req.nextUrl.searchParams) con Zod. */
export function parseQuery<T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T,
): z.infer<T> {
  const obj = Object.fromEntries(req.nextUrl.searchParams.entries());
  const result = schema.safeParse(obj);
  if (!result.success) {
    throw new ValidationError(result.error.flatten().fieldErrors);
  }
  return result.data;
}

/** IP de origen (respeta proxies de Railway / Supabase). */
export function getClientIp(req: NextRequest): string | undefined {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? undefined;
}

export function getUserAgent(req: NextRequest): string | undefined {
  return req.headers.get('user-agent') ?? undefined;
}
