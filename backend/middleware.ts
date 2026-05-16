// ============================================================
//  middleware.ts — CORS para el frontend React/Vite existente.
//  El frontend consume la API con credentials: "include", por lo
//  que se requiere un origen explícito (no "*") y
//  Access-Control-Allow-Credentials: true.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function middleware(req: NextRequest) {
  const reqOrigin = req.headers.get('origin');
  // Solo se refleja el origen si coincide con el frontend permitido.
  const allowOrigin = reqOrigin === FRONTEND_ORIGIN ? reqOrigin : FRONTEND_ORIGIN;
  const headers = corsHeaders(allowOrigin);

  // Respuesta a la petición preflight.
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers });
  }

  const res = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) {
    res.headers.set(key, value);
  }
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
