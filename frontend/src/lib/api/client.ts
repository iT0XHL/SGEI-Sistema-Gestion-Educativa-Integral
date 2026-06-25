// ============================================================
//  lib/api/client.ts — Cliente HTTP base para el backend SGEI.
//  · Siempre usa credentials: "include" para la cookie HttpOnly.
//  · Lanza ApiError con el código de error del backend.
//  · BASE_URL apunta al backend Next.js corriendo en :3001.
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init?.headers,
    },
  });

  const json = (await res.json()) as ApiSuccess<T> | ApiErrorResponse;

  if (!json.success) {
    const err = json.error;
    throw new ApiError(err.code, err.message, res.status, err.details);
  }

  return json.data;
}

export const apiClient = {
  get<T>(path: string, params?: Record<string, string | undefined>) {
    const url = params
      ? `${path}?${new URLSearchParams(
          Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
        )}`
      : path;
    return request<T>(url);
  },

  post<T>(path: string, body: unknown) {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  postFormData<T>(path: string, formData: FormData) {
    return request<T>(path, {
      method: 'POST',
      body: formData,
    });
  },

  patch<T>(path: string, body: unknown) {
    return request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  patchFormData<T>(path: string, formData: FormData) {
    return request<T>(path, {
      method: 'PATCH',
      body: formData,
    });
  },

  put<T>(path: string, body: unknown) {
    return request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete<T>(path: string) {
    return request<T>(path, { method: 'DELETE' });
  },
};
