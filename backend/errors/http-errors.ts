// ============================================================
//  errors/http-errors.ts — Jerarquía de errores de aplicación.
//  Cada error lleva su `code`, `statusCode` y `details` opcionales,
//  consumidos por `errorResponse()` en lib/response.ts.
// ============================================================

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** 400 — Datos de entrada inválidos (normalmente desde Zod). */
export class ValidationError extends AppError {
  constructor(details: unknown, message = 'Los datos enviados no son válidos') {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

/** 401 — No autenticado / credenciales inválidas. */
export class UnauthorizedError extends AppError {
  constructor(code = 'UNAUTHORIZED', message = 'No autorizado', details?: unknown) {
    super(code, message, 401, details);
  }
}

/** 403 — Autenticado pero sin permisos (RBAC). */
export class ForbiddenError extends AppError {
  constructor(code = 'FORBIDDEN', message = 'No tiene permisos para esta acción') {
    super(code, message, 403);
  }
}

/** 404 — Entidad no encontrada. */
export class NotFoundError extends AppError {
  constructor(entidad: string) {
    super('NOT_FOUND', `${entidad} no encontrado`, 404);
  }
}

/** 409 — Conflicto de estado (ej. recurso duplicado). */
export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', message, 409, details);
  }
}

/** 422 — Violación de una regla de negocio. */
export class BusinessRuleError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, message, 422, details);
  }
}

/** 423 — Cuenta bloqueada (intentos fallidos / bloqueado_hasta). */
export class AccountLockedError extends AppError {
  constructor(message: string, details?: unknown) {
    super('ACCOUNT_LOCKED', message, 423, details);
  }
}
