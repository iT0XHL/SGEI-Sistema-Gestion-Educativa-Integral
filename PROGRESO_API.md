# SGEI — Progreso de Conexión Frontend → API Real

Fecha de última actualización: 2026-05-20 (DocenteTareas conectado)

Este archivo documenta qué módulos del frontend ya están conectados a la API real
(backend Next.js + PostgreSQL) y cuáles aún usan datos mock.

---

## Stack del proyecto

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS 4 + React Router 7
- **Backend:** Next.js 14 App Router + Prisma ORM + PostgreSQL 15 + JWT HttpOnly cookie
- **Infra:** Docker Compose — frontend :3000, backend :3001, DB :5432
- **Paquetes:** `pnpm` (pnpm-workspace.yaml)

---

## Archivos de infraestructura creados / modificados

| Archivo | Estado | Descripción |
|---|---|---|
| `frontend/src/lib/hooks/useSession.ts` | ✅ Existe | Hook de sesión — devuelve `SessionUser` con `entidadId`, `rol`, `nombre` |
| `frontend/src/lib/api/client.ts` | ✅ Existe | `apiClient` con `credentials: 'include'`, filtra params `undefined`, lanza `ApiError` |
| `frontend/src/lib/api/auth.api.ts` | ✅ Existe | `authApi.me()` — GET /api/auth/me |
| `frontend/src/lib/api/alumnos.api.ts` | ✅ Existe | `alumnosApi.obtener()`, `alumnosApi.cursos()` |
| `frontend/src/lib/api/bimestres.api.ts` | ✅ Existe | `bimestresApi.listar()` |
| `frontend/src/lib/api/notas.api.ts` | ✅ Existe | `notasApi.listar()`, `notasApi.upsertBatch()` |
| `frontend/src/lib/api/materiales.api.ts` | ✅ Existe | `materialesApi.listar()`, `materialesApi.getArchivoUrl()` |
| `frontend/src/lib/api/actividades.api.ts` | ✅ Existe | `actividadesApi.listar()`, `actividadesApi.listarEntregas()`, `actividadesApi.entregarConArchivo()` |
| `frontend/src/lib/api/pagos.api.ts` | ✅ Existe | `pagosApi.listar()` — rol Alumno devuelve `EstadoPagoRow[]` |
| `frontend/src/lib/api/boletas.api.ts` | ✅ Existe | `boletasApi.subir()` — multipart/form-data; maneja re-envío automático |
| `frontend/src/lib/api/libretas.api.ts` | ✅ Existe | `libretasApi.obtener()`, `libretasApi.descargarPdf()` (raw fetch, lanza `Error` plain) |
| `frontend/src/lib/api/asistencias.api.ts` | ✅ Existe | `asistenciasApi.listar()`, `asistenciasApi.resumen()` |
| `frontend/src/lib/api/horarios.api.ts` | ✅ **CREADO** | `horariosApi.listar()`, `formatHorarioCurso()` — nuevo en estas sesiones |
| `frontend/src/lib/courseColors.ts` | ✅ **CREADO** | Paleta compartida: `getCourseColor()`, `gradeToLiteral()`, `literalColor()`, `formatDate()` |
| `frontend/src/types/pago.ts` | ✅ Existe | `EstadoPagoRow`, `BoletaPago`, `EstadoPago`, `toFrontEstado()`, `toDbEstado()` |
| `frontend/src/types/asistencia.ts` | ✅ Existe | `AsistenciaRegistro`, `EstadoAsistencia`, `ResumenAsistencia`, `DB_TO_UI` |
| `frontend/src/types/nota.ts` | ✅ Existe | `Nota`, `LibretaRow`, `NotaLiteral` |
| `frontend/src/types/actividad.ts` | ✅ Existe | `Actividad`, `Entrega`, `EstadoEntrega` |

---

## Portal Alumno — `/alumno`

| Página | Archivo | Estado | Notas clave |
|---|---|---|---|
| Dashboard | `AlumnoDashboard.tsx` | ✅ **API** | 3 fases paralelas: alumno+cursos+bimestres → notas+actividades → entregas |
| Mis Cursos | `AlumnoCursos.tsx` | ✅ **API** | Link navega con `asig.curso_id` (no `asig.id`); color estable por índice |
| Detalle Curso | `AlumnoCursoDetalle.tsx` | ✅ **API** | Upload state machine; `TIPOS_CON_ARCHIVO`; `estaVencida()`; re-entrega |
| Libreta Digital | `AlumnoLibreta.tsx` | ✅ **API** | Rowspan table; `LIBRETA_BLOQUEADA`; PDF blob download; bimestre auto-select |
| Estado de Pagos | `AlumnoPagos.tsx` | ✅ **API** | `pagosApi.listar()` sin params; re-upload abre mismo modal; refresh tras subida |
| Asistencias | `AlumnoAsistencias.tsx` | ✅ **API** | `asistenciasApi.listar({})` sin params; mismos totales para todos los cursos |

**Total portal alumno: 6/6 páginas conectadas.**

---

## Portal Docente — `/docente`

| Página | Archivo | Estado | Notas clave |
|---|---|---|---|
| Dashboard | `DocenteDashboard.tsx` | ✅ **API** | 4 fases; `asistenciasApi.resumen()` para contar alumnos; batch pendientes |
| Mis Tareas | `DocenteTareas.tsx` | ✅ **API** | 3 tabs: materiales (`materialesApi`), actividades (`actividadesApi.crear/actualizar/eliminar`), calificaciones (entregas lazy-load por tab) |
| Notas | `DocenteNotas.tsx` | ✅ **API** | Selector asignación + bimestre reales; competencias UUID de `/api/competencias`; alumnos de `resumen()`; precarga notas; `upsertBatch()` con UUIDs reales |
| Asistencia | `DocenteAsistencia.tsx` | ✅ **API** | Selector de asignación real; alumnos desde `asistenciasApi.resumen()`; precarga existente con `DB_TO_UI`; guarda con `UI_TO_DB` |

**Total portal docente: 4/4 páginas conectadas.**

---

## Portal Secretaría — `/secretaria`

| Página | Archivo | Estado |
|---|---|---|
| Dashboard | `SecretariaDashboard.tsx` | ❌ **MOCK** |
| Alumnos | `SecretariaAlumnos.tsx` | ❌ **MOCK** |
| Pagos | `SecretariaPagos.tsx` | ❌ **MOCK** |
| Vouchers | `SecretariaVouchers.tsx` | ❌ **MOCK** |
| SIAGIE | `SecretariaSIAGIE.tsx` | ❌ **MOCK** |
| Situación Final | `SecretariaSituacionFinal.tsx` | ❌ **MOCK** |

**Total portal secretaría: 0/6 páginas conectadas.**

---

## Portal Admin — `/admin`

| Página | Archivo | Estado |
|---|---|---|
| Dashboard | `AdminDashboard.tsx` | ❌ **MOCK** |
| Bimestres | `AdminBimestres.tsx` | ❌ **MOCK** |
| Bloqueo | `AdminBloqueo.tsx` | ❌ **MOCK** |
| Competencias | `AdminCompetencias.tsx` | ❌ **MOCK** |
| Cuentas | `AdminCuentas.tsx` | ❌ **MOCK** |
| Escala Literal | `AdminEscalaLiteral.tsx` | ❌ **MOCK** |
| Horarios | `AdminHorarios.tsx` | ❌ **MOCK** |
| Institución | `AdminInstitucion.tsx` | ❌ **MOCK** |
| Período | `AdminPeriodo.tsx` | ❌ **MOCK** |
| Asistencia Docente | `AdminAsistenciaDocente.tsx` | ❌ **MOCK** |

**Total portal admin: 0/10 páginas conectadas.**

---

## Resumen global

| Portal | Conectadas | Total | % |
|---|---|---|---|
| Alumno | 6 | 6 | 100% |
| Docente | 4 | 4 | 100% |
| Secretaría | 0 | 6 | 0% |
| Admin | 0 | 10 | 0% |
| **Total** | **10** | **26** | **38%** |

---

## Decisiones técnicas importantes

### Comportamiento de la API por rol

- **Alumno:** El backend ignora `alumnoId` en el query y usa `user.entidadId` del JWT.
  Afecta: `pagosApi.listar()`, `asistenciasApi.listar({})`, `actividadesApi.listar({})`, `libretasApi.obtener()`.

- **Docente:** El backend filtra actividades por `docenteId` del JWT automáticamente.
  `GET /api/asistencias/resumen` lanza `ForbiddenError` para Alumno pero no para Docente.

- **Asignaciones del docente:** `GET /api/asignaciones?docenteId=:id` requiere pasar el ID explícitamente.

### Tipos y serialización

- `nota_vigesimal` (Prisma `Decimal`) llega como **string** en JSON → siempre envolver con `Number()`.
- `libretasApi.descargarPdf()` usa `fetch` crudo (no `apiClient`) → lanza `Error` plain, no `ApiError`.
  Para detectar bloqueo: `err.message.toLowerCase().includes('bloqueada')`.
- `ApiError` (de `apiClient`) tiene propiedad `.code` — usar para `LIBRETA_BLOQUEADA`.

### Patrones usados en todos los módulos

```typescript
// Cleanup flag para React Strict Mode
let aborted = false;
// ...
return () => { aborted = true; };

// Carga paralela con fallback individual
const [a, b] = await Promise.all([
  apiA().catch(() => fallbackA),
  apiB().catch(() => fallbackB),
]);

// Filtrar `undefined` en params: apiClient.get ya lo hace internamente
```

### Rutas de navegación

- Alumno a detalle de curso: `/alumno/cursos/:curso_id` (UUID del curso, NO del asignacion_id)
- Docente a tareas de sección: `/docente/tareas?seccionId=:seccionId&cursoId=:cursoId`

### Paleta de colores compartida

`getCourseColor(index)` en `lib/courseColors.ts` devuelve el mismo color para el mismo índice
en AlumnoCursos y AlumnoCursoDetalle — garantiza consistencia visual entre vistas.

---

## Próximos módulos recomendados (por prioridad)

1. **`SecretariaVouchers.tsx`** — revisión de boletas con `boletasApi.revisar()`
2. **`SecretariaPagos.tsx`** — gestión de pagos
3. **`SecretariaAlumnos.tsx`** — listado y gestión de alumnos
4. **`SecretariaDashboard.tsx`** — resumen con contadores reales
5. **`AdminBimestres.tsx`** / **`AdminPeriodo.tsx`** — configuración del año escolar
6. **`AdminBloqueo.tsx`** — bloqueo de libretas por deuda
7. **`AdminCuentas.tsx`** / **`AdminCompetencias.tsx`** — gestión de usuarios y competencias
