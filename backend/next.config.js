/** @type {import('next').NextConfig} */

// Headers de seguridad — Guía Técnica §19
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // El backend es API-only: el frontend React/Vite existente vive aparte
  // y consume estos Route Handlers con credentials: "include".
  async headers() {
    return [{ source: '/api/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
