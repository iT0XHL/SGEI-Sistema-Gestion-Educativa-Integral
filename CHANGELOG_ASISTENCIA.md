# Changelog — Módulo de Asistencia (SGEI)

_Fecha: 28 de junio de 2026 · Rama: `master`_

Mejora integral del módulo de asistencia para que se comporte como el de una
institución educativa real, manteniendo la estructura del sistema y **sin
cambios en el esquema de la base de datos**. Todo lo descrito fue verificado
en vivo contra el stack en Docker (rebuild limpio de volumen + suite de pruebas).

---

## ✨ Nuevas funcionalidades

- **Panel de Asistencia de Alumnos para Administración** (`/admin/asistencia-alumnos`).
  Supervisión institucional con dos vistas:
  - **Resumen por sección**: tabla por alumno con Presentes / Tardanzas / Faltas /
    Justificados, días registrados y **% de asistencia**, más tarjetas de totales
    y promedio de la sección.
  - **Sesiones (detalle)**: registros agrupados por fecha, mostrando el **docente
    que registró** cada sesión, con filtros por estado, alumno y rango de fechas.

- **Historial de Asistencia para Docentes** (`/docente/historial-asistencia`).
  El docente consulta todas sus sesiones registradas, agrupadas por fecha y
  **filtrables por curso–sección, estado de asistencia, alumno y rango de fechas**.

## 🔧 Mejoras

- **Validaciones de lógica educativa real** al registrar asistencia de alumnos:
  - Solo días lectivos: se rechaza sábado y domingo (`DIA_NO_LECTIVO`).
  - No se permiten fechas futuras (`FECHA_FUTURA`).
  - El docente solo registra si tiene **clase programada ese día** en el horario
    de la sección (`SIN_CLASE_PROGRAMADA`) — no se registra fuera del horario.
  - El docente solo gestiona secciones que tiene asignadas (`SECCION_NO_ASIGNADA`).
  - Todos los alumnos deben estar **matriculados y activos** en la sección
    (`ALUMNO_NO_PERTENECE`); se bloquea registrar alumnos ajenos.
  - Sin duplicados: re-registrar el mismo día actualiza el registro existente
    (idempotente), nunca crea uno nuevo.

- **Validaciones equivalentes en la asistencia de docentes**: día lectivo y no
  futura; el duplicado del mismo día devuelve conflicto (`409`).

- **Lista completa de alumnos en el resumen**: el resumen por sección ahora parte
  de los alumnos matriculados (LEFT JOIN), por lo que **aparecen todos los
  estudiantes** aunque la sección aún no tenga registros (antes la lista del
  docente podía salir vacía al pasar lista por primera vez).

- **Filtro por estado** en el listado/historial de asistencia de alumnos.

- **Escalabilidad para grandes volúmenes**: el listado de asistencia admite
  paginación acotada (`limit` por defecto 1000, máximo 5000, y `offset`),
  evitando respuestas sin límite cuando se acumula data masiva.

## 🔐 Seguridad y control de acceso (RBAC)

- **La asistencia de docentes pasa a ser exclusiva de Administración.** Antes la
  Secretaría también podía acceder; ahora `GET/POST/PATCH /api/asistencias`
  requieren rol Admin, alineado con el diseño del DDL/RLS. La Secretaría ya no
  participa en este flujo.
- Confirmado por rol: el alumno no puede registrar asistencia (`403`), el docente
  no puede operar secciones ajenas (`403`), y el alumno solo ve su propia
  asistencia.

## 🧹 Limpieza / eliminación de duplicaciones

- Eliminada la ruta y el módulo **duplicados y sin uso** de asistencia de docentes
  (`/api/asistencias/docentes` y `asistencia-docentes.*`). El flujo vivo siempre
  usó la ruta base `/api/asistencias`.
- Eliminado un **segundo cliente API duplicado** (`asistenciaDocentesApi` en
  `admin.api.ts`) que apuntaba a la ruta retirada y que ningún componente usaba.

## 🐛 Correcciones

- Resuelto el caso en que un docente no podía pasar lista en una sección nueva
  porque la lista de alumnos llegaba vacía (ver "Lista completa de alumnos").
- Mensajes de error claros y con código máquina para cada regla de negocio,
  mapeados a respuestas HTTP 422/403 limpias y consistentes en todas las rutas.

### Corrección adicional detectada en pruebas — Bimestres (fuera de asistencia)

- **403 al cargar el panel de Docente/Alumno**: `GET /api/bimestres` estaba
  restringido a Admin/Secretaría, pero docentes (notas) y alumnos (libreta,
  cursos) lo necesitan como dato académico de referencia. Ahora la **lectura es
  para cualquier usuario autenticado** (igual que cursos/grados/competencias);
  la creación/edición/borrado siguen siendo solo de Admin.
- **Shape de respuesta inconsistente**: el cliente `bimestres.api.ts` declaraba
  devolver un arreglo, pero el endpoint responde paginado (`{ items, meta }`),
  lo que rompía los consumidores con `.filter`/`.map`. El cliente ahora
  **normaliza y siempre devuelve un arreglo**. Verificado: el dashboard del
  docente carga su cadena completa (asignaciones → bimestre activo → notas).

## 🧪 Verificación

- Reconstrucción limpia del stack (`docker compose down -v && up -d`): la cadena
  de inicialización de la base de datos (DDL → migraciones → seed) se ejecuta sin
  errores.
- Suite de API por rol y módulo (`backend/test-modulos.sh`): todos los grupos OK,
  RBAC correcto.
- Suite específica de asistencia: **14/14 casos** de validación y RBAC pasan
  (alumnos y docentes), incluida la idempotencia.
- Typecheck del frontend sin errores.

## 📋 Notas

- **Sin cambios en el esquema de la base de datos.** La asistencia sigue siendo
  por sección y día; el contexto de curso/sesión se deriva del horario y de las
  asignaciones docente–curso–sección.
- Limitación conocida no modificada: en el portal del alumno, la asistencia se
  muestra a nivel de sección (mismo % en todos los cursos), por el modelo de datos
  por día.

---

### Detalle técnico de archivos

**Backend**
- `app/api/asistencias/route.ts`, `app/api/asistencias/[id]/route.ts` — RBAC a solo Admin.
- `modules/asistencias/asistencia-alumnos.{service,repository,schema}.ts` — validaciones de negocio, filtro de estado, paginación, resumen con LEFT JOIN.
- `modules/asistencia/asistencia.service.ts` — validaciones de día lectivo y fecha futura para asistencia docente.
- Eliminados: `app/api/asistencias/docentes/**`, `modules/asistencias/asistencia-docentes.*`.
- `test-modulos.sh` — pruebas de asistencia actualizadas a las nuevas rutas/roles.

**Frontend**
- `app/pages/admin/AdminAsistenciaAlumnos.tsx` — **nuevo** panel de Administración.
- `app/pages/docente/DocenteAsistenciaHistorial.tsx` — **nuevo** historial del docente.
- `app/pages/docente/DocenteAsistencia.tsx` — envía la asignación al registrar.
- `app/routes.tsx`, `app/components/layout/AppShell.tsx` — nuevas rutas y navegación.
- `lib/api/asistencias.api.ts`, `types/asistencia.ts` — filtro de estado, paginación, datos de registrador/sección.
- `lib/api/admin.api.ts` — eliminación del cliente duplicado.
