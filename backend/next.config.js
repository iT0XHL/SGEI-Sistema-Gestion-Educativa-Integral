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
  // pdfkit necesita cargar archivos .afm en runtime; externalizarlo evita
  // que webpack intente empaquetar sus fuentes y rompa la ruta.
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals = [...(config.externals ?? []), 'pdfkit'];
    }
    return config;
  },
};

module.exports = nextConfig;
