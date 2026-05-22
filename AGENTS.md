# AGENTS.md — SGEI

SGEI (Sistema de Gestión Educativa Integral) — Peruvian secondary school management app. Spanish throughout.

## Repo structure

Monorepo: `frontend/` (Vite+React 18 SPA), `backend/` (Next.js 14 API), `SQL/` (PostgreSQL DDL + seed). Docker Compose at root orchestrates all three.

## Commands

- **Frontend** (`frontend/`): `pnpm dev`, `pnpm build`. No test/lint/typecheck scripts.
- **Backend** (`backend/`): `npm run dev`, `npm run build` (prisma generate + next build), `npm run lint` (next lint).
- **Full stack**: `docker compose up --build` from repo root.
- Package manager: **pnpm** for frontend, **npm** for backend.

## Architecture

- **Entry:** `frontend/src/main.tsx` → `src/app/App.tsx` (React Query wrapper) → `src/app/routes.tsx`.
- **Role portals:** `/alumno`, `/docente`, `/admin`, `/secretaria` — each nests pages under `AppShell` layout. `/` = Login, `*` → `/`.
- **Role = first URL path segment** normalized to PascalCase by `normalizeRole()` in `AppShell.tsx:22`. Sidebar nav, labels, gradient colors keyed off `Role`.
- **Auth is real** (CLAUDE.md is outdated). Login calls `authApi.login()`, `AppShell` runs `useSession()` → `authApi.me()` on mount, session guard redirects if JWT role ≠ URL role. API client uses `credentials: 'include'` for HttpOnly cookies.
- **Data is mixed**: `src/app/data/mockData.ts` is the static mock source. Some pages use it, some call real APIs via `src/lib/api/` (16 modules). App is in transition.
- **`@` → `src/`**, `figma:asset/<file>` resolved by custom Vite plugin to `src/assets/`.
- **shadcn/ui primitives** in `src/app/components/ui/`, `cn()` from `utils.ts` (clsx+tailwind-merge) for class merging. Tailwind v4 via `@tailwindcss/vite` plugin (no PostCSS config needed).

## Backend-alignment corrections

`src/imports/pasted_text/*.md` = spec docs for aligning frontend with PostgreSQL DDL v2.0 (field lengths, regex, FK, ENUMs). Apply on request as "correcciones". `src/app/utils/voucherStatusMapper.ts` is a completed example: `toDbStatus()` / `toFrontStatus()` for the `estado_revision_boleta` ENUM.

## Style conventions

- Styling: inline Tailwind utilities, `slate` neutral palette, error text = `text-xs text-red-500`.
- All user-facing text, identifiers, domain terms in Spanish. Keep them that way.
