# Plan — Simulacro de Admisión (modelo final, alineado al audio)

> Estado: **IMPLEMENTADO Y VERIFICADO** end-to-end contra el stack vivo.
> Flujo (presencial, solo Docente + Administrador):
> **Admin crea** el simulacro (por bimestre) → **el DOCENTE lo activa** → con el
> simulacro activo, cada docente sube **5 preguntas por curso y grado que enseña**
> → el **Admin selecciona** del banco (p. ej. 10 de 2 docentes → 5) y arma el
> examen **por grado** → descarga **Cuestionario + Balotario PDF** para imprimir.
> El alumno **no** interviene (rinde el examen impreso).

## 1. Reglas (del audio del profesor)
- Simulacros por período: **mín. 2, máx. 4** (`numero` 1–4).
- **Presencial**: solo se arman e imprimen documentos; no hay examen en línea.
- Solo **Docente + Administrador** gestionan el simulacro.
- **El docente activa** el simulacro; recién entonces puede subir preguntas.
- El docente sube **5 preguntas** del **curso y grado que enseña** (su asignación).
- Preguntas de **opción múltiple A–E** con clave; **imagen opcional**.
- **Un examen por grado** (3°A y 3°B reciben el mismo): 1°–6° Primaria, 1°–5° Secundaria.
- El admin **escoge** entre todas las preguntas (de varios docentes) las que van al examen.

## 2. Diseño implementado

### 2.1 Activación por el docente (gated)
- `PATCH /api/simulacros/:id/estado` lo pueden llamar **Admin y Docente** (el
  docente solo puede `Activo`; concluir es solo del Admin).
- La carga del docente (`/api/simulacros/activo/carga`) devuelve:
  - `simulacro` (activo, o `null`),
  - `proximoSimulacro` (primer Borrador a activar, si no hay activo),
  - `cursos` y `grados` que **enseña** el docente (de sus asignaciones).
- `guardarPreguntas` **exige** un simulacro activo (`SIN_SIMULACRO_ACTIVO`) y que el
  docente **dicte ese curso en ese grado** (asignación). Bloque de 5 (reemplazo idempotente).

### 2.2 Examen = documento congelado (snapshot)
- `simulacro_examen_pregunta` guarda **copia** de enunciado/alternativas/clave/imagen
  al armar (FK `pregunta_id` → SET NULL). El examen impreso **no se rompe** si luego
  el docente edita o borra su pregunta. Es la "plantilla" inmutable para imprimir.

### 2.3 Grados y asignaciones
- `SQL/06-grados-niveles.sql`: nivel **Primaria** + grados **1°–6°**; Secundaria
  **1°,2°,4°,5°** (3° ya existía); 1 sección "A"; `grado_curso` (8 cursos por grado);
  bimestres III y IV; y **asignaciones**: cada docente del 3° dicta su curso en
  **todos los grados**, para que pueda aportar preguntas a cualquier grado.
  (Demo: en producción el admin asigna a los docentes reales por grado.)

## 3. Cambios por capa (hechos)
- **DB** (`SQL/05-simulacro-banco.sql`, idempotente, montado en compose):
  `simulacro_pregunta.simulacro_id` NULLABLE + FK SET NULL; columnas snapshot en
  `simulacro_examen_pregunta` + `pregunta_id` NULLABLE/SET NULL; índice de banco.
- **Prisma**: campos opcionales + snapshot; `prisma generate`.
- **Backend** (`modules/simulacros`): `findPendiente` (próximo Borrador);
  `getCargaDocente` (simulacro + proximoSimulacro + cursos + grados); `guardarPreguntas`
  gated + por asignación; curaduría/examen por `simulacro_id`; `guardarExamen` hace
  **snapshot**; PDF lee del snapshot. Ruta estado: Admin **y** Docente activan.
- **Frontend**: `DocenteSimulacro` muestra activar el próximo simulacro, y con activo
  el formulario de 5 preguntas por curso+grado; `AdminSimulacro` con selector de
  **bimestre** y curaduría; tipos de API alineados (snapshot, proximoSimulacro).
- **Seed** (`SQL/06-grados-niveles.sql`, montado en compose como `03-…`): grados +
  asignaciones en todos los grados.

## 4. Verificación (stack vivo)
- Sin simulacro activo, el docente que intenta subir → **422 SIN_SIMULACRO_ACTIVO** (gated). ✔
- El docente **activa** el próximo Borrador → **200**. ✔
- Con activo, el docente sube 5 preguntas → **201**. ✔
- Admin curaduría → **200**; arma examen (snapshot) → **200**; Cuestionario y
  Balotario **PDF** → **200 application/pdf**. ✔
- Probado en **3° Secundaria** y en **1° Primaria** (todos los grados cubiertos). ✔
- `tsc` backend y frontend: **0 errores** en archivos de simulacro. ✔

## 5. No-ruptura
- Cambios de columnas aditivos/nullable; migración idempotente; el snapshot hace
  inmutables los exámenes; otros módulos no tocan tablas de simulacro.
- Datos de prueba limpiados (0 simulacros): el admin crea los reales.
