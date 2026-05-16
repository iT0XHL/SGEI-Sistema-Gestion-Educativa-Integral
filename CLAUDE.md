# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SGEI (Sistema de Gestión Educativa Integral) — a Spanish-language school-management frontend for a Peruvian secondary school. UI text, identifiers, and domain terms are in Spanish; keep them that way. Originally exported from Figma Make (`vite.config.ts` comments warn against removing the React/Tailwind plugins it depends on).

## Commands

Package manager is **pnpm** (`pnpm-workspace.yaml`).

- `pnpm install` — install dependencies
- `pnpm dev` — start the Vite dev server
- `pnpm build` — production build

There is no test suite, linter, or typecheck script configured.

## Architecture

Single-page React 18 app: Vite + TypeScript + React Router 7 + Tailwind CSS 4.

- **Entry:** `src/main.tsx` → `src/app/App.tsx` (just `<RouterProvider>`) → `src/app/routes.tsx`.
- **Routing (`routes.tsx`):** `createBrowserRouter` with four role portals — `/alumno`, `/docente`, `/admin`, `/secretaria` — each nesting its pages under a shared `AppShell` layout. `/` is the `Login` page; unknown paths redirect to `/`.
- **Role is derived from the URL.** `AppShell` (`components/layout/AppShell.tsx`) reads the first path segment (`alumno`, `docente`, ...) and `normalizeRole()` converts it to the PascalCase `Role` type (`'Alumno' | 'Docente' | 'Admin' | 'Secretaria'`). The sidebar nav, labels, and gradient colors are all keyed off `Role` via the `NAV_CONFIG`/`ROLE_LABELS`/`ROLE_COLORS` maps. There is no auth — `Login` just `navigate()`s to the chosen portal.
- **Pages:** `src/app/pages/<role>/` — one component per route, each a self-contained screen.
- **Data is entirely mocked.** `src/app/data/mockData.ts` is the single source for all entities (users, courses, students, grades, payments, vouchers, schedules) plus shared helpers (`gradeToLiteral`, `literalColor`, `avg`) and the `COLOR_MAP` Tailwind-class lookup. There is no API layer or persistence — page state is local `useState`.

## UI conventions

- Components in `src/app/components/ui/` are **shadcn/ui** primitives (Radix-based). `cn()` from `components/ui/utils.ts` merges Tailwind classes.
- Styling is Tailwind utility classes inline; the `slate` palette is the neutral base. Error feedback uses small red text (`text-xs text-red-500`) below the field. Match these patterns rather than introducing new ones.
- `@` is aliased to `src/`. Imports of the form `figma:asset/<file>` resolve to `src/assets/` via a custom Vite plugin.

## Backend-alignment corrections

`src/imports/pasted_text/*.md` are spec documents describing required frontend changes to align inputs/types with a planned PostgreSQL backend's strict DDL (DDL v2.0) — field length limits, regex validation, FK constraints, ENUM values. They are **not** implemented automatically; treat them as the task backlog when asked to apply "correcciones". `src/app/utils/voucherStatusMapper.ts` is an example of this alignment: it maps front status values (`submitted`/`approved`/`rejected`) to/from the DB `estado_revision_boleta` ENUM. Use `toDbStatus()` when sending to an API and `toFrontStatus()` when reading.
