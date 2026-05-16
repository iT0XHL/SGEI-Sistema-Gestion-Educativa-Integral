# Prompt de Correcciones Frontend — SGEI
## Para uso en Figma Make / AI-powered code generation

---

## Contexto del proyecto

Estás trabajando sobre el frontend del **Sistema de Gestión Escolar Integrado (SGEI)**, construido en **React + TypeScript** con componentes Shadcn/UI y Tailwind CSS. El backend usa **PostgreSQL** con restricciones DDL estrictas definidas en DDL v2.0. Las correcciones que siguen **no implican cambios estructurales en la base de datos**, sino que buscan alinear los inputs del frontend con las restricciones ya existentes en la DB, y mejorar la experiencia de validación para el usuario.

---

## Corrección 1 — `SecretariaAlumnos.tsx` · Campo DNI

### Problema actual
El campo DNI utiliza `.replace(/\D/g,'').slice(0,8)` en el `onChange` para filtrar caracteres no numéricos. Sin embargo, **no existe un `onPaste` handler**, lo que permite pegar texto que contenga exactamente 8 caracteres no numéricos y pasar la validación de longitud sin ser detectado como inválido. La columna en DB es `CHAR(8) CHECK(~/^[0-9]{8}$/)`.

### Código actual relevante
```tsx
// onChange actual (línea ~487)
onChange={e => setForm(f => ({ ...f, dni: e.target.value.replace(/\D/g, '').slice(0, 8) }))}

// handleCreate actual (línea ~120)
if (form.dni.length !== 8 || dniError) return;
```

### Correcciones requeridas

**1.1 — Reforzar `handleCreate()` con regex de validación numérica estricta:**
```tsx
// Reemplazar la validación existente por:
if (!/^[0-9]{8}$/.test(form.dni)) return; // Bloquear submit si no cumple formato exacto
```

**1.2 — Agregar `onPaste` handler al input de DNI:**
```tsx
onPaste={e => {
  e.preventDefault();
  const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
  setForm(f => ({ ...f, dni: pasted }));
}}
```

**1.3 — UI:** El campo ya muestra un mensaje de error en tiempo real (`dniError`). Asegurarse de que ese mensaje también se dispare visualmente cuando el usuario intenta hacer submit con un valor inválido (estado `submitAttempted`), manteniendo el estilo de error en color rojo ya presente en el componente.

---

## Corrección 2 — `AdminCuentas.tsx` · Campo Email

### Problema actual
El input de email del formulario "Crear cuenta" no tiene atributo `maxLength`. La columna `docente.email_institucional` es `VARCHAR(150)` en PostgreSQL. Strings más largos de 150 caracteres serán rechazados o truncados por la DB sin que el usuario reciba retroalimentación previa en el frontend.

### Código actual relevante
```tsx
// Input de email actual (línea ~402–408)
<input
  type="email"
  value={form.email}
  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
  // ... clases de estilo existentes
/>
```

### Correcciones requeridas

**2.1 — Agregar `maxLength` y mantener `type="email"`:**
```tsx
<input
  type="email"
  maxLength={150}
  value={form.email}
  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
  // ... clases de estilo existentes
/>
```

**2.2 — Agregar validación en `handleCreate()` antes del submit:**
```tsx
// Añadir junto a la validación de campos requeridos existente:
if (form.email.length > 150) return;
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return;
```

**2.3 — UI:** Debajo del input, mostrar un mensaje de error inline (usando el mismo patrón de `submitAttempted` que ya existe en el componente) cuando el email supere los 150 caracteres o tenga formato inválido. Usar el estilo de error rojo ya presente en el formulario para consistencia visual.

---

## Corrección 3 — `AdminHorarios.tsx` · Campo Aula

### Problema actual
El input del campo "Aula" (`form.room`) no define `maxLength`. La columna `horario.aula` es `VARCHAR(20)` en PostgreSQL. Valores más largos de 20 caracteres serán rechazados por la DB sin feedback previo al usuario.

### Código actual relevante
```tsx
// Input de aula actual (línea ~349)
<input
  value={form.room}
  onChange={e => setForm(p => ({ ...p, room: e.target.value }))}
  placeholder="Ej. Aula 301"
  className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
/>
```

### Correcciones requeridas

**3.1 — Agregar `maxLength={20}` al input:**
```tsx
<input
  value={form.room}
  onChange={e => setForm(p => ({ ...p, room: e.target.value }))}
  maxLength={20}
  placeholder="Ej. Aula 301"
  className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
/>
```

**3.2 — Agregar contador de caracteres visible debajo del input:**
```tsx
// Debajo del input de aula, agregar:
<p className="text-xs text-slate-400 text-right mt-1">
  {form.room.length}/20
</p>
```
El contador debe cambiar a color rojo (`text-red-500`) cuando `form.room.length >= 20`.

**3.3 — UI:** No es necesario un mensaje de error explícito ya que `maxLength` previene el exceso de caracteres, pero el contador visual actúa como feedback proactivo para el usuario.

---

## Corrección 4 — `DocenteTareas.tsx` · Formulario "Crear actividad" (campos Título e Instrucciones)

### Problema actual
En el modal "Crear actividad" (`modal === 'actividad'`), el input de **Título** (`actTitle`) no tiene `maxLength`. La columna `academic_schema.actividad.titulo` es `VARCHAR(200)`. El **textarea de Instrucciones** (`actInstr`) tampoco tiene límite; aunque la columna `actividad.descripcion` es `TEXT` (ilimitado en DB), se requiere un límite de UX de 2000 caracteres. Ninguno de los dos campos muestra contadores de caracteres.

### Código actual relevante
```tsx
// Input de título actual (línea ~561)
<input
  value={actTitle}
  onChange={e => setActTitle(e.target.value)}
  placeholder={`Ej. ${actType} N° 3 — Capítulo 5`}
  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
/>

// Textarea de instrucciones actual (línea ~565)
<textarea
  value={actInstr}
  onChange={e => setActInstr(e.target.value)}
  rows={3}
  placeholder="Describe qué deben hacer los estudiantes…"
  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
/>
```

### Correcciones requeridas

**4.1 — Agregar `maxLength={200}` al input de Título + contador:**
```tsx
<input
  value={actTitle}
  onChange={e => setActTitle(e.target.value)}
  maxLength={200}
  placeholder={`Ej. ${actType} N° 3 — Capítulo 5`}
  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
/>
<p className={`text-xs text-right mt-1 ${actTitle.length >= 200 ? 'text-red-500' : 'text-slate-400'}`}>
  {actTitle.length}/200
</p>
```

**4.2 — Agregar `maxLength={2000}` al textarea de Instrucciones + contador:**
```tsx
<textarea
  value={actInstr}
  onChange={e => setActInstr(e.target.value)}
  maxLength={2000}
  rows={3}
  placeholder="Describe qué deben hacer los estudiantes…"
  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
/>
<p className={`text-xs text-right mt-1 ${actInstr.length >= 2000 ? 'text-red-500' : 'text-slate-400'}`}>
  {actInstr.length}/2000
</p>
```

**4.3 — Nota sobre el campo `matTitle` en el modal "Publicar material":** Revisar si el input de título de material (`matTitle`) en el modal separado (`modal === 'material'`) también requiere `maxLength={200}` por la misma restricción de columna. Aplicar la misma corrección si corresponde.

---

## Resumen de cambios por archivo

| Archivo | Campo | Cambio |
|---|---|---|
| `SecretariaAlumnos.tsx` | `form.dni` | `onPaste` handler + validación regex en `handleCreate()` |
| `AdminCuentas.tsx` | `form.email` | `maxLength={150}` + validación en `handleCreate()` |
| `AdminHorarios.tsx` | `form.room` | `maxLength={20}` + contador de caracteres |
| `DocenteTareas.tsx` | `actTitle` | `maxLength={200}` + contador de caracteres |
| `DocenteTareas.tsx` | `actInstr` | `maxLength={2000}` + contador de caracteres |

## Principios de implementación

- **No romper el diseño existente.** Todos los cambios son aditivos; no modificar clases de estilo existentes en los inputs a menos que sea estrictamente necesario para mostrar el estado de error.
- **Consistencia de patrones.** Usar el mismo patrón de mensajes de error ya establecido en el proyecto (texto rojo pequeño debajo del campo, activado por `submitAttempted` o en tiempo real según corresponda).
- **Sin cambios en la DB.** Las restricciones DDL ya son correctas. Solo se alinea el frontend con ellas.
- **Contadores de caracteres:** Usar `text-xs text-right mt-1` con color `text-slate-400` en estado normal y `text-red-500` al alcanzar el límite, para mantener coherencia con el sistema de diseño Tailwind/slate ya usado en el proyecto.