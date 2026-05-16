# Prompt de Módulos Faltantes — SGEI
## Para uso en Figma Make / AI-powered code generation

---

## Contexto del proyecto

Estás trabajando sobre el frontend del **Sistema de Gestión Escolar Integrado (SGEI)**, construido en **React + TypeScript + Vite**, con componentes **Shadcn/UI** y estilos en **Tailwind CSS**. El enrutamiento usa `react-router` con `createBrowserRouter`. La estructura de páginas se organiza por rol: `src/app/pages/alumno/`, `docente/`, `admin/` y `secretaria/`.

Las correcciones de esta ronda son **módulos completamente nuevos** — pantallas que no existen en el proyecto actual — que deben crearse desde cero y registrarse en el sistema de navegación existente. Cada módulo tiene un equivalente directo en la base de datos PostgreSQL (`academic_schema`) y su ausencia bloquea flujos críticos de producción.

---

## Convenciones del proyecto que DEBES respetar

### Patrón visual (rol Admin — `from-slate-700 to-slate-900`)
Todos los módulos del rol Admin siguen este patrón extraído de `AdminCuentas.tsx` y `AdminDashboard.tsx`:
- **Layout:** `<div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">`
- **Header de página:**
  ```tsx
  <div>
    <p className="text-sm text-slate-500 mb-1">Panel de administración</p>
    <h1 className="text-2xl font-bold text-slate-900">Título del Módulo</h1>
    <p className="text-sm text-slate-500 mt-0.5">Subtítulo descriptivo</p>
  </div>
  ```
- **Tabla:** `bg-white rounded-2xl border border-slate-200 shadow-sm` con `<thead>` en `bg-slate-50` y celdas `px-4 py-3.5 text-sm`
- **Botón primario Admin:** `bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium`
- **Modal/Sheet:** overlay con `fixed inset-0 bg-black/50`, panel `bg-white rounded-2xl shadow-2xl max-w-lg w-full`
- **Mensajes de error inline:** `text-xs text-red-500 mt-1`
- **Estado vacío / skeleton:** usar `bg-slate-100 animate-pulse rounded` cuando no hay datos

### Patrón visual (rol Secretaría — `from-teal-600 to-teal-800`)
Extraído de `SecretariaAlumnos.tsx` y `SecretariaSIAGIE.tsx`:
- **Layout:** idéntico al Admin (`p-6 lg:p-8 max-w-6xl mx-auto space-y-8`)
- **Botón primario Secretaría:** `bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium`
- **Badges de estado:** `rounded-full px-2.5 py-0.5 text-xs font-medium` con variantes de color (`bg-emerald-100 text-emerald-700`, `bg-amber-100 text-amber-700`, `bg-red-100 text-red-700`)

### Patrón de estado local (mock-first)
Todos los módulos existentes operan con **estado local React** y mock data, con llamadas a API comentadas como `// En producción: fetch(...)`. Seguir este mismo patrón en los nuevos módulos.

### Navegación — `AppShell.tsx` y `routes.tsx`
- El sidebar de cada rol lee su menú desde `NAV_CONFIG` en `AppShell.tsx`
- Las rutas se registran en `src/app/routes.tsx` con `createBrowserRouter`
- Los íconos vienen de `lucide-react`

---

## MÓDULO 1 — `AdminPeriodo.tsx`
### Ruta: `/admin/periodo` | Ícono sugerido: `CalendarRange` (lucide-react)

### Por qué es crítico
Sin esta pantalla no se puede crear ni activar un año lectivo. El trigger `fn_un_periodo_activo()` en PostgreSQL garantiza que solo exista un período activo; pero si nunca se crea ningún período, **todos los Foreign Keys que referencian `periodo_id` fallarán** en cascada (alumnos, horarios, bimestres, notas, pagos).

### Tabla DB de referencia
```sql
academic_schema.periodo_academico (
  id          UUID PRIMARY KEY,
  anio        INTEGER NOT NULL,          -- Ej: 2025
  nombre      VARCHAR(100) NOT NULL,     -- Ej: "Año Escolar 2025"
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE NOT NULL,
  activo       BOOLEAN DEFAULT FALSE     -- Solo uno TRUE a la vez (trigger)
)
```

### Estructura de la pantalla

**Sección superior — Tabla de períodos:**
- Columnas: Año, Nombre, Fecha inicio, Fecha fin, Estado (`activo` → badge verde "Activo" / gris "Inactivo"), Acciones
- Acción por fila: botón "Activar período" (solo visible en filas con `activo = false`)
  - Al hacer clic: mostrar `AlertDialog` de confirmación ("¿Activar este período? El período actualmente activo será desactivado automáticamente por el sistema.")
  - Al confirmar: actualizar estado en local con `setItems(prev => prev.map(p => ({ ...p, activo: p.id === id })))`
  - Comentar la llamada real: `// PATCH /api/periodos/${id}/activar`

**Sección inferior / Modal — Formulario "Crear nuevo período":**
- Campos:
  - `anio`: input `type="number"` min={2020} max={2099}, `maxLength` implícito por el tipo numérico
  - `nombre`: input text, `maxLength={100}`, placeholder "Ej. Año Escolar 2025"
  - `fecha_inicio`: usar el componente `DatePicker` importado desde `../../components/DatePicker`
  - `fecha_fin`: ídem `DatePicker`
- Validación antes del submit:
  ```ts
  if (!form.anio || !form.nombre.trim() || !form.fechaInicio || !form.fechaFin) return;
  if (form.fechaFin <= form.fechaInicio) { setError('La fecha fin debe ser posterior a la fecha inicio'); return; }
  ```
- Al crear: agregar al estado local con `activo: false` (el trigger solo activa cuando se pulsa "Activar período" explícitamente)

**Mock data inicial sugerida:**
```ts
const MOCK_PERIODOS = [
  { id: 'p1', anio: 2025, nombre: 'Año Escolar 2025', fecha_inicio: '2025-03-10', fecha_fin: '2025-12-19', activo: true },
  { id: 'p2', anio: 2024, nombre: 'Año Escolar 2024', fecha_inicio: '2024-03-11', fecha_fin: '2024-12-20', activo: false },
];
```

### Registro en navegación

**`AppShell.tsx` — agregar en `NAV_CONFIG.Admin`:**
```tsx
{ label: 'Período Académico', path: '/admin/periodo', icon: CalendarRange },
```

**`routes.tsx` — agregar en el bloque `/admin`:**
```tsx
import AdminPeriodo from './pages/admin/AdminPeriodo';
// ...
{ path: 'periodo', Component: AdminPeriodo },
```

---

## MÓDULO 2 — `AdminBimestres.tsx`
### Ruta: `/admin/bimestres` | Ícono sugerido: `BookMarked` (lucide-react)

### Por qué es crítico
Sin bimestres creados no se pueden registrar notas. El cierre de un bimestre dispara el trigger `fn_cerrar_notas_bimestre()` en PostgreSQL, que bloquea todas las notas existentes para ese bimestre (las hace inmutables). Sin la pantalla, ese trigger nunca se activa y el módulo de notas permanece abierto indefinidamente.

### Tabla DB de referencia
```sql
academic_schema.bimestre (
  id           UUID PRIMARY KEY,
  periodo_id   UUID REFERENCES periodo_academico(id),
  numero       INTEGER CHECK (numero BETWEEN 1 AND 4),
  nombre       VARCHAR(50),   -- Ej: "Bimestre I"
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE NOT NULL,
  cerrado      BOOLEAN DEFAULT FALSE
)
```

### Estructura de la pantalla

**Filtro de período activo:**
- Mostrar un banner informativo en la parte superior indicando el período activo actual: `"Período activo: Año Escolar 2025"` (badge verde con ícono `CheckCircle2`)
- Si no hay período activo, mostrar estado de advertencia con el mensaje: `"No hay período académico activo. Crea y activa un período primero."`

**Tabla de bimestres del período activo:**
- Columnas: N°, Nombre, Fecha inicio, Fecha fin, Estado (`cerrado` → badge rojo "Cerrado" / verde "Abierto"), Acciones
- Acción por fila: botón "Cerrar bimestre" (solo visible cuando `cerrado = false`)
  - Al hacer clic: mostrar `AlertDialog` de confirmación con advertencia explícita:
    > "Esta acción es **irreversible**. Al cerrar el bimestre, todas las notas registradas quedarán bloqueadas automáticamente por el sistema y no podrán modificarse."
  - Al confirmar: `setItems(prev => prev.map(b => b.id === id ? { ...b, cerrado: true } : b))`
  - Comentar la llamada real: `// PATCH /api/bimestres/${id}/cerrar`
- Filas con `cerrado = true`: mostrar ícono de candado (`Lock` de lucide) junto al nombre

**Mock data inicial sugerida:**
```ts
const MOCK_BIMESTRES = [
  { id: 'b1', numero: 1, nombre: 'Bimestre I',   fecha_inicio: '2025-03-10', fecha_fin: '2025-05-16', cerrado: true },
  { id: 'b2', numero: 2, nombre: 'Bimestre II',  fecha_inicio: '2025-05-19', fecha_fin: '2025-07-25', cerrado: false },
  { id: 'b3', numero: 3, nombre: 'Bimestre III', fecha_inicio: '2025-08-11', fecha_fin: '2025-10-17', cerrado: false },
  { id: 'b4', numero: 4, nombre: 'Bimestre IV',  fecha_inicio: '2025-10-20', fecha_fin: '2025-12-19', cerrado: false },
];
```

### Registro en navegación

**`AppShell.tsx` — agregar en `NAV_CONFIG.Admin`:**
```tsx
{ label: 'Bimestres', path: '/admin/bimestres', icon: BookMarked },
```

**`routes.tsx`:**
```tsx
import AdminBimestres from './pages/admin/AdminBimestres';
// ...
{ path: 'bimestres', Component: AdminBimestres },
```

---

## MÓDULO 3 — `AdminEscalaLiteral.tsx`
### Ruta: `/admin/escala` | Ícono sugerido: `Sliders` (lucide-react)

### Por qué es crítico
La función PostgreSQL `fn_vigesimal_to_literal()` es llamada automáticamente al registrar cualquier nota. Si no existen registros en `config_escala_literal` para el período activo, la función **lanza una excepción** y bloquea completamente el módulo de notas. Es una dependencia de arranque antes de que los docentes puedan ingresar notas.

### Tabla DB de referencia
```sql
academic_schema.config_escala_literal (
  id              UUID PRIMARY KEY,
  periodo_id      UUID REFERENCES periodo_academico(id),
  escala          VARCHAR(2) CHECK (escala IN ('AD','A','B','C')),
  rango_inferior  NUMERIC(4,2) NOT NULL,  -- Ej: 18.00
  rango_superior  NUMERIC(4,2) NOT NULL,  -- Ej: 20.00
  descripcion     VARCHAR(200)
)
```

### Estructura de la pantalla

**Banner de contexto:**
- Mostrar el período activo actual (igual que en AdminBimestres)
- Texto de ayuda: `"La escala literal define cómo se convierte la nota vigesimal (0–20) en calificación AD/A/B/C. Debe cubrir el rango completo de 0 a 20 sin superposiciones."`

**Tabla de 4 escalas fijas (AD / A / B / C):**
- La tabla siempre muestra exactamente 4 filas — una por escala. No es posible agregar ni eliminar filas.
- Columnas: Escala (badge de color), Descripción, Rango inferior, Rango superior, Acciones (editar)
- Color de badges: AD → `bg-emerald-100 text-emerald-700`, A → `bg-blue-100 text-blue-700`, B → `bg-amber-100 text-amber-700`, C → `bg-red-100 text-red-700`

**Edición inline por fila (no modal):**
- Al hacer clic en "Editar" de una fila, los campos `rango_inferior` y `rango_superior` se convierten en inputs `type="number"` con `step="0.01"` y `min="0"` `max="20"` dentro de la propia celda
- Botón "Guardar" por fila que valida y persiste
- Validación al guardar:
  ```ts
  if (rango_inferior >= rango_superior) { setRowError('El rango inferior debe ser menor al superior'); return; }
  if (rango_inferior < 0 || rango_superior > 20) { setRowError('Los rangos deben estar entre 0 y 20'); return; }
  ```
- Comentar la llamada real: `// PUT /api/escala-literal/${id}`

**Validación global — botón "Verificar cobertura":**
- Al hacer clic, verificar programáticamente que los 4 rangos cubren [0, 20] sin superposición ni huecos
- Mostrar resultado con `CheckCircle2` (verde: "Los rangos cubren el rango completo 0–20") o `AlertTriangle` (rojo: lista de los problemas encontrados)

**Mock data inicial sugerida (escala MINEDU Perú):**
```ts
const MOCK_ESCALA = [
  { id: 'e1', escala: 'AD', descripcion: 'Logro destacado',     rango_inferior: 18, rango_superior: 20 },
  { id: 'e2', escala: 'A',  descripcion: 'Logro esperado',      rango_inferior: 14, rango_superior: 17.99 },
  { id: 'e3', escala: 'B',  descripcion: 'En proceso',          rango_inferior: 11, rango_superior: 13.99 },
  { id: 'e4', escala: 'C',  descripcion: 'En inicio',           rango_inferior: 0,  rango_superior: 10.99 },
];
```

### Registro en navegación

**`AppShell.tsx`:**
```tsx
{ label: 'Escala de Calificaciones', path: '/admin/escala', icon: Sliders },
```

**`routes.tsx`:**
```tsx
import AdminEscalaLiteral from './pages/admin/AdminEscalaLiteral';
// ...
{ path: 'escala', Component: AdminEscalaLiteral },
```

---

## MÓDULO 4 — `SecretariaSituacionFinal.tsx`
### Ruta: `/secretaria/situacion-final` | Ícono sugerido: `GraduationCap` (ya importado en lucide)

### Por qué es crítico
Sin este módulo no se puede registrar el cierre académico anual de cada alumno. La tabla `situacion_final_alumno` es requerida por la vista materializada `audit_schema.formato_siagie`, que genera el acta para el MINEDU. Si la tabla está vacía, **`SecretariaSIAGIE` devolverá un acta vacía** aunque todos los demás datos estén completos.

### Tabla DB de referencia
```sql
academic_schema.situacion_final_alumno (
  id                       UUID PRIMARY KEY,
  alumno_id                UUID REFERENCES alumno(id),
  periodo_id               UUID REFERENCES periodo_academico(id),
  situacion_final          VARCHAR(20) CHECK (situacion_final IN (
                             'Promovido','Repitente','Retirado','Trasladado','Fallecido')),
  motivo_retiro            TEXT,           -- Requerido si situacion IN ('Retirado','Trasladado')
  comportamiento           CHAR(2) CHECK (comportamiento IN ('AD','A','B','C')),
  numero_areas_desaprobadas INTEGER DEFAULT 0
)
```

### Estructura de la pantalla

**Filtros superiores:**
- Selector de Nivel (`Primaria` / `Secundaria`)
- Selector de Grado (`1°` a `5°`)
- Selector de Sección (`A`, `B`, `C`)
- Buscador por nombre de alumno

**Tabla de alumnos con edición inline:**
- Columnas: Alumno (nombre + initials avatar), Grado/Sección, Situación Final, Comportamiento, Áreas Desaprobadas, Acciones
- **Selector de Situación Final** (inline, por fila): `<select>` con opciones `Promovido | Repitente | Retirado | Trasladado | Fallecido`
  - Color de badge según valor: Promovido → emerald, Repitente → amber, Retirado/Trasladado → red, Fallecido → slate
- **Campo `motivo_retiro`**: aparecer como input text inline **solo cuando** `situacion_final` es `'Retirado'` o `'Trasladado'`. Requerido en esos casos.
- **Selector de Comportamiento** (inline): `<select>` con opciones `AD | A | B | C`
- **Input `numero_areas_desaprobadas`** (inline): `type="number"` min=0 max=13
- **Botón "Guardar fila"** por alumno: solo habilitado cuando hay cambios no guardados en esa fila
  - Comentar la llamada real: `// PATCH /api/situacion-final/${alumno_id}`

**Resumen estadístico (parte superior, antes de la tabla):**
```tsx
// Tarjetas de conteo:
// Promovidos: X | Repitentes: X | Retirados/Trasladados: X | Sin registrar: X
```
Usar el mismo patrón de tarjetas stat que `AdminDashboard.tsx` (`bg-white rounded-2xl border border-slate-200 shadow-sm p-5`).

**Mock data inicial:** reutilizar `STUDENTS_3A` de `mockData.ts` para poblar la lista. Agregar campos `situacion_final: null`, `comportamiento: 'A'`, `numero_areas_desaprobadas: 0` como estado inicial.

### Registro en navegación

**`AppShell.tsx` — agregar en `NAV_CONFIG.Secretaria`:**
```tsx
{ label: 'Situación Final', path: '/secretaria/situacion-final', icon: GraduationCap },
```

**`routes.tsx`:**
```tsx
import SecretariaSituacionFinal from './pages/secretaria/SecretariaSituacionFinal';
// ...
{ path: 'situacion-final', Component: SecretariaSituacionFinal },
```

---

## MÓDULO 5 — `AdminInstitucion.tsx`
### Ruta: `/admin/institucion` | Ícono sugerido: `School` (lucide-react)

### Por qué es crítico
La vista materializada `audit_schema.formato_siagie` hace JOIN con `institucion_educativa WHERE activo = TRUE`. Si no existe un registro activo, **la vista devuelve vacío** y `SecretariaSIAGIE` no puede generar ningún acta con cabecera válida. Es el primer dato que debe configurarse en cualquier instancia del sistema.

### Tabla DB de referencia
```sql
academic_schema.institucion_educativa (
  id               UUID PRIMARY KEY,
  codigo_modular   CHAR(7) NOT NULL,       -- Código único MINEDU
  codigo_ugel      VARCHAR(10) NOT NULL,
  nombre_ugel      VARCHAR(200) NOT NULL,
  nombre           VARCHAR(300) NOT NULL,
  modalidad        VARCHAR(50),            -- Ej: "EBR"
  gestion          VARCHAR(20),            -- Ej: "Privada"
  departamento     VARCHAR(100),
  provincia        VARCHAR(100),
  distrito         VARCHAR(100),
  direccion        TEXT,
  activo           BOOLEAN DEFAULT TRUE
)
```

### Estructura de la pantalla

Este módulo es un **formulario de configuración único** (no lista, no CRUD complejo). Diseñar como una vista de "Configuración del sistema" con un solo registro editable.

**Layout sugerido:** Dos columnas en desktop, una en móvil. Agrupar campos en secciones con separadores:

**Sección 1 — Identificación MINEDU:**
- `codigo_modular`: input text, `maxLength={7}`, placeholder "0000000". Mostrar descripción: `"Código único de 7 dígitos asignado por el MINEDU"`
- `codigo_ugel`: input text, `maxLength={10}`, placeholder "Ej. 01"
- `nombre_ugel`: input text, `maxLength={200}`, placeholder "Ej. UGEL 01 San Juan de Miraflores"

**Sección 2 — Datos del colegio:**
- `nombre`: input text, `maxLength={300}`, placeholder "Ej. I.E. San José de Calasanz"
- `modalidad`: `<select>` con opciones `EBR | EBE | EBA | ETP`
- `gestion`: `<select>` con opciones `Pública | Privada | Concertada`

**Sección 3 — Ubicación:**
- `departamento`, `provincia`, `distrito`: inputs text con `maxLength={100}` cada uno
- `direccion`: textarea con `maxLength={500}`, `rows={3}`

**Estado activo:** Switch o checkbox al pie: "Registro activo (visible para reportes SIAGIE)". Mostrar advertencia si se desactiva: `"Desactivar este registro hará que el acta SIAGIE no incluya la cabecera del colegio."`

**Botón de guardado:** Un solo botón "Guardar configuración" al pie. Mostrar estado de éxito inline tras guardar.

**Validaciones antes de guardar:**
```ts
if (!/^\d{7}$/.test(form.codigo_modular)) { setError('El código modular debe tener exactamente 7 dígitos'); return; }
if (!form.nombre.trim() || !form.nombre_ugel.trim()) return;
```

**Mock data inicial:**
```ts
const MOCK_INSTITUCION = {
  codigo_modular: '0563801', codigo_ugel: '01',
  nombre_ugel: 'UGEL 01 San Juan de Miraflores',
  nombre: 'I.E. San José de Calasanz', modalidad: 'EBR', gestion: 'Privada',
  departamento: 'Lima', provincia: 'Lima', distrito: 'San Juan de Miraflores',
  direccion: 'Jr. Las Flores 123, Urb. Los Jardines', activo: true,
};
```

### Registro en navegación

**`AppShell.tsx`:**
```tsx
{ label: 'Institución Educativa', path: '/admin/institucion', icon: School },
```

**`routes.tsx`:**
```tsx
import AdminInstitucion from './pages/admin/AdminInstitucion';
// ...
{ path: 'institucion', Component: AdminInstitucion },
```

---

## MÓDULO 6 — `AdminCompetencias.tsx` + ajuste en `DocenteNotas.tsx`
### Ruta: `/admin/competencias` | Ícono sugerido: `ListChecks` (lucide-react)

### Por qué es crítico
`DocenteNotas.tsx` actualmente importa `COMPETENCIES` desde `mockData.ts` — un objeto hardcodeado que nunca cambia. En producción, las competencias deben venir de la DB. Sin esta pantalla de administración, no hay forma de agregar ni modificar competencias por curso, y cualquier cambio curricular requeriría modificar el código fuente.

### Tabla DB de referencia
```sql
academic_schema.competencia (
  id          UUID PRIMARY KEY,
  curso_id    UUID REFERENCES curso(id),
  nombre      VARCHAR(300) NOT NULL,
  descripcion TEXT,
  tipo        VARCHAR(20) CHECK (tipo IN ('regular','transversal')),
  orden       INTEGER DEFAULT 0
)
```

### Parte A — Crear `AdminCompetencias.tsx`

**Sección de filtro — Selector de curso:**
```tsx
// Selector con dos niveles:
// 1. Nivel: Primaria | Secundaria
// 2. Nombre del curso (poblado dinámicamente según el nivel)
// Usar COURSES de mockData.ts como fuente de cursos disponibles
```

**Tabla de competencias del curso seleccionado:**
- Columnas: Orden, Nombre, Tipo (badge: `regular` → blue, `transversal` → purple), Acciones (Editar, Eliminar)
- Reordenamiento: botones `↑ ↓` por fila para cambiar el campo `orden`
- Eliminar: `AlertDialog` de confirmación antes de borrar

**Formulario "Nueva competencia" (modal o panel lateral):**
- Campos:
  - `nombre`: input text, `maxLength={300}`, requerido
  - `descripcion`: textarea, `maxLength={1000}`, opcional
  - `tipo`: `<select>` con opciones `regular | transversal`
  - `orden`: input `type="number"`, auto-rellenado con el siguiente número disponible
- Validación: `if (!form.nombre.trim()) return;`

**Mock data inicial:** usar `COMPETENCIES` de `mockData.ts` para poblar las competencias iniciales de cada curso.

### Parte B — Ajuste en `DocenteNotas.tsx` (archivo existente)

**Ubicar las líneas actuales:**
```tsx
// Línea actual (importación hardcodeada):
import { STUDENTS_3A, COMPETENCIES, GRADE_ENTRIES, literalColor, gradeToLiteral } from '../../data/mockData';

// Línea actual de uso:
const comps = COMPETENCIES[courseId] || [];
```

**Reemplazar por estado local con carga simulada:**
```tsx
// 1. Eliminar COMPETENCIES del import de mockData
import { STUDENTS_3A, GRADE_ENTRIES, literalColor, gradeToLiteral, COMPETENCIES } from '../../data/mockData';

// 2. Agregar estado para competencias con carga mock-first:
const [comps, setComps] = useState<string[]>([]);
const [compsLoading, setCompsLoading] = useState(false);

useEffect(() => {
  setCompsLoading(true);
  // Mock: simular llamada GET /api/competencias?curso_id=${courseId}
  // En producción: const res = await fetch(`/api/competencias?curso_id=${courseId}`);
  setTimeout(() => {
    setComps(COMPETENCIES[courseId] || []);
    setCompsLoading(false);
  }, 300);
}, [courseId]);

// 3. Mientras carga, mostrar skeletons en lugar de la tabla:
{compsLoading ? (
  <div className="space-y-2">
    {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-xl" />)}
  </div>
) : (
  // tabla de notas existente...
)}
```

### Registro en navegación

**`AppShell.tsx`:**
```tsx
{ label: 'Competencias', path: '/admin/competencias', icon: ListChecks },
```

**`routes.tsx`:**
```tsx
import AdminCompetencias from './pages/admin/AdminCompetencias';
// ...
{ path: 'competencias', Component: AdminCompetencias },
```

---

## Resumen de archivos a crear / modificar

| Acción | Archivo | Rol |
|---|---|---|
| ✅ CREAR | `src/app/pages/admin/AdminPeriodo.tsx` | Admin |
| ✅ CREAR | `src/app/pages/admin/AdminBimestres.tsx` | Admin |
| ✅ CREAR | `src/app/pages/admin/AdminEscalaLiteral.tsx` | Admin |
| ✅ CREAR | `src/app/pages/secretaria/SecretariaSituacionFinal.tsx` | Secretaría |
| ✅ CREAR | `src/app/pages/admin/AdminInstitucion.tsx` | Admin |
| ✅ CREAR | `src/app/pages/admin/AdminCompetencias.tsx` | Admin |
| 🔄 MODIFICAR | `src/app/pages/docente/DocenteNotas.tsx` | Docente |
| 🔄 MODIFICAR | `src/app/components/layout/AppShell.tsx` | Global |
| 🔄 MODIFICAR | `src/app/routes.tsx` | Global |

## Íconos nuevos a importar en `AppShell.tsx`

```tsx
import {
  // ... íconos ya existentes ...
  CalendarRange,   // AdminPeriodo
  BookMarked,      // AdminBimestres
  Sliders,         // AdminEscalaLiteral
  School,          // AdminInstitucion
  ListChecks,      // AdminCompetencias
  // GraduationCap ya está importado → reutilizar para SecretariaSituacionFinal
} from 'lucide-react';
```

## Principios de implementación

- **Consistencia visual absoluta.** Cada módulo nuevo debe ser indistinguible visualmente de los existentes. Copiar clases de Tailwind exactas de `AdminCuentas.tsx` para Admin y de `SecretariaAlumnos.tsx` para Secretaría.
- **Mock-first, API-ready.** Todo el estado es local. Las llamadas HTTP van comentadas en línea con el endpoint esperado, listas para ser descomentadas cuando el backend esté disponible.
- **Sin dependencias nuevas.** No instalar paquetes adicionales. Usar únicamente: Shadcn/UI ya instalado, lucide-react, el componente `DatePicker` existente en `src/app/components/DatePicker.tsx`, y los datos de `src/app/data/mockData.ts`.
- **TypeScript estricto.** Definir interfaces locales para cada entidad (ej. `interface PeriodoAcademico { ... }`). No usar `any`.
- **`AlertDialog` para acciones irreversibles.** Activar período, cerrar bimestre, y eliminar competencia deben usar el componente `alert-dialog` de Shadcn ya disponible en `src/app/components/ui/alert-dialog.tsx`.