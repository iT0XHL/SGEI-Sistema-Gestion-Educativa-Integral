# SGEI — Guía Técnica Completa de Backend
## Sistema de Gestión Educativa Integral
**Stack: Next.js 14 · Node.js 20 · PostgreSQL 15 (Supabase) · Prisma ORM · JWT · RBAC · ExcelJS**

---

## 1. ANÁLISIS DE FUENTES

### Script SQL (`sgei_ddl_v2_1_auditado.sql`) — Fuente de verdad técnica
**4 esquemas:** `auth_schema`, `academic_schema`, `financial_schema`, `audit_schema`  
**21 tablas reales identificadas:**
- `auth_schema`: `credencial`, `perfil_usuario`
- `academic_schema`: `institucion_educativa`, `nivel`, `grado`, `seccion`, `alumno`, `docente`, `periodo_academico`, `bimestre`, `curso`, `competencia`, `asignacion_docente`, `horario`, `config_escala_literal`, `nota`, `asistencia`, `asistencia_docente`, `material`, `actividad`, `entrega_actividad`, `situacion_final_alumno`
- `financial_schema`: `concepto_pago`, `pago`, `boleta_pago`, `notificacion`
- `audit_schema`: `sesion_auditoria`, `historial_nota`, `integracion_siagie`

**Vistas materializadas:** `academic_schema.mv_libreta_alumno`, `audit_schema.formato_siagie`  
**Vistas simples:** `academic_schema.v_resumen_asistencia`, `financial_schema.v_estado_pagos_alumno`  
**13 ENUMs, 6 funciones PL/pgSQL, 1 Stored Procedure (`revisar_boleta`), 8 triggers, 16 políticas RLS**

**Observaciones críticas del SQL:**
- NO existe entidad `Matricula` (eliminada en v2.1)
- NO existe entidad `Apoderado` (eliminada en v2.1)
- El rol `"Alumno/Padre"` que aparece en el login del Figma → en el SQL existe SOLO el rol `Alumno`
- La nota_literal es calculada automáticamente por el trigger `tg_set_nota_literal`
- El SP `revisar_boleta` maneja la transición de estados del voucher (no el backend directamente)
- `bloqueo_manual` en `alumno` permite bloquear la libreta independientemente de deuda
- La autenticación usa `auth_schema.credencial` (NO Supabase Auth)

### PDF de Capturas — 25 pantallas reales analizadas
Roles visualizados: **Alumno** (Portal del Alumno), **Docente** (Portal Docente), **Administrador** (Panel de administración), **Secretaría** (Portal de Secretaría)

Pantallas clave observadas y sus datos visibles:
- Login: selección de rol + email + contraseña
- Alumno/inicio: cursos con nota/escala, actividades próximas
- Alumno/cursos: cards con promedio, escala, actividades pendientes, horario
- Alumno/libreta: tabla por área>competencia, notas por bimestre, escala, botón Descargar PDF
- Alumno/asistencias: % presencias/tardanzas/faltas por curso
- Alumno/pagos: historial mensual, subir voucher, info bancaria
- Docente/inicio: KPIs (secciones, tareas pendientes, estudiantes, % notas)
- Docente/asistencia: lista de alumnos, P/F/T por fecha
- Docente/tareas-materiales: materiales + actividades + calificaciones por sección
- Docente/notas: grilla alumno × competencia, promedio, escala, por bimestre
- Admin/inicio: KPIs (450 alumnos, 6 docentes, 50% asistencia, 14 libretas bloqueadas)
- Admin/cuentas: tabla usuarios con rol, correo, estado, desactivar
- Admin/horarios: grilla semanal L-V con bloques por sección
- Admin/asistencia-docente: lista docentes, P/F/T, guardar por fecha
- Admin/periodos: tabla años escolares, activar/desactivar
- Admin/bimestres: 4 bimestres, cerrar bimestre
- Admin/escala-calificaciones: AD/A/B/C con rangos editables, verificar cobertura
- Admin/institucion: código modular 7 dígitos, código UGEL, nombre UGEL, datos IE
- Admin/competencias: tabla por curso/nivel, orden, tipo, editar/eliminar
- Secretaria/inicio: KPIs financieros + alerta vouchers pendientes
- Secretaria/alumnos: tabla alumnos con DNI, grado, sección, nivel, usuario
- Secretaria/vouchers: cards con comprobantes pendientes, aprobar/rechazar
- Secretaria/pagos: recaudado, por cobrar, mora 5%, estado por alumno
- Secretaria/siagie: conversión escalar, KPIs, motor de conversión AD/A/B/C
- Secretaria/situacion-final: tabla alumnos con situación final editable, comportamiento, áreas desaprobadas

### Figma
**No se pudo acceder al link de Figma.** Todo el análisis se basa en el PDF de capturas, el documento del proyecto y el SQL.

### Archivo SIAGIE Excel (`5b2ec4_...xls`)
**Hoja única:** `Acta 1` (116 filas × 60 columnas)  
**Estructura identificada:**

**Cabecera institucional (filas 6-20):**
- Código UGEL, Nombre UGEL
- Código Modular (7 dígitos), Resolución de Creación
- Modalidad (EBR/EBE/EAD), Gestión (P/PR)
- Grado (1-5), Sección (A,B,C o "-"), Turno
- Período lectivo: Inicio, Fin
- Ubicación: Departamento, Provincia, Distrito, Centro Poblado

**Columnas de datos por alumno (fila 22 en adelante):**
- Col 0: Nº Orden
- Col 1: Código del Estudiante (código SIAGIE)
- Cols 2-15: Apellidos y Nombres (orden alfabético)
- Col 36: Sexo H/M
- Cols 37-47: Áreas curriculares (A=Matemática, B=Comunicación, C=Idioma extranjero, D=Arte, E=Ciencias Sociales, F=Persona/Familia, G=Ed.Física, H=Ed.Religiosa, I=Ciencia/Tec/Amb, J=Ed.Trabajo, K=Especialidad Ocupacional)
- Cols 48-52: Talleres 1-5
- Col 53: Nº Áreas/Talleres Desaprobados
- Col 54: Comportamiento
- Col 55: Situación Final
- Col 56: Motivo del Retiro
- Cols 57-59: Observaciones, Evaluación (Final/Recuperación/Ubicación/Est.Independ)

**Valores permitidos SIAGIE:**
- Escala notas: AD, A, B, C (NUNCA vigesimal en el acta)
- Gestión: P (Público), PR (Privado)
- Modalidad: EBR, EBE, EAD
- Motivos de retiro: EC, AG, TR, VI, EN, AD, OT
- Situación final: derivada de `situacion_final_alumno`
- Evaluación: Final, Recuperación, Ubicación, Est.Independ

### Documento del proyecto
Confirma stack, funcionalidades, reglas de negocio (mora 5% acumulativa, bloqueo libreta por deuda, cierre de notas, RBAC). No presenta conflictos con el SQL, pero menciona "Alumno/Padre" que el SQL resuelve solo como rol `Alumno`.

### Diferencias encontradas
| Fuente | Diferencia |
|--------|-----------|
| Figma/capturas | Muestra "Alumno / Padre" en el login |
| SQL | Solo existe `rol_usuario.Alumno` — no hay rol Padre |
| **Resolución** | El alumno accede con su propio usuario; no crear rol Padre |
| Capturas: boleta | Usa el término "voucher" visualmente |
| SQL | La entidad se llama `boleta_pago` |
| **Resolución** | Usar `boleta_pago` en el backend, "voucher" solo en la UI |

---

## 2. ARQUITECTURA BACKEND PROPUESTA

### Capas del sistema

```
Request HTTP
     │
     ▼
[Next.js Route Handler] ← app/api/**
     │
     ▼
[Middleware: JWT + RBAC] ← middlewares/
     │
     ▼
[Validación Zod] ← schemas/
     │
     ▼
[Servicio] ← modules/*/[module].service.ts
     │
     ▼
[Repositorio] ← modules/*/[module].repository.ts
     │
     ▼
[Prisma Client / $queryRaw] ← prisma/client.ts
     │
     ▼
[PostgreSQL 15 en Supabase]
```

**Principios aplicados al SGEI:**
- Los triggers SQL (`tg_set_nota_literal`, `tg_cerrar_notas_bimestre`, `tg_validar_cruce_horario`, `tg_boleta_insertada`) se respetan — el backend NO replica su lógica
- El SP `revisar_boleta` se invoca vía `$queryRaw` desde `VoucherService`
- Las vistas materializadas `mv_libreta_alumno` y `formato_siagie` se consultan con `$queryRaw`
- RLS de Supabase actúa como segunda capa de seguridad
- `app.current_user_id` se setea en cada transacción para el trigger de auditoría

---

## 3. ESTRUCTURA DE CARPETAS

```
sgei/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── me/route.ts
│   │   ├── alumnos/
│   │   │   ├── route.ts                    # GET list, POST create
│   │   │   └── [id]/
│   │   │       ├── route.ts                # GET, PUT, DELETE
│   │   │       ├── pagos/route.ts
│   │   │       ├── asistencias/route.ts
│   │   │       └── libreta/route.ts
│   │   ├── docentes/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── usuarios/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── institucion/route.ts
│   │   ├── periodos/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── bimestres/route.ts
│   │   ├── bimestres/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── cerrar/route.ts
│   │   ├── escala-calificaciones/route.ts
│   │   ├── niveles/route.ts
│   │   ├── grados/route.ts
│   │   ├── secciones/route.ts
│   │   ├── cursos/route.ts
│   │   ├── competencias/route.ts
│   │   ├── asignaciones/route.ts
│   │   ├── horarios/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── asistencias/
│   │   │   ├── alumnos/route.ts
│   │   │   └── docentes/route.ts
│   │   ├── notas/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── materiales/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── actividades/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── entregas/route.ts
│   │   ├── libretas/
│   │   │   ├── [alumnoId]/route.ts
│   │   │   └── [alumnoId]/pdf/route.ts
│   │   ├── pagos/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── vouchers/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── aprobar/route.ts
│   │   │       └── rechazar/route.ts
│   │   ├── siagie/
│   │   │   ├── preview/route.ts
│   │   │   ├── validar/route.ts
│   │   │   ├── generar/route.ts
│   │   │   └── historial/route.ts
│   │   ├── situacion-final/route.ts
│   │   ├── dashboard/
│   │   │   ├── admin/route.ts
│   │   │   ├── secretaria/route.ts
│   │   │   ├── docente/route.ts
│   │   │   └── alumno/route.ts
│   │   ├── notificaciones/
│   │   │   ├── route.ts
│   │   │   └── [id]/leer/route.ts
│   │   └── auditoria/route.ts
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── admin/...
│   ├── docente/...
│   ├── alumno/...
│   ├── secretaria/...
│   └── layout.tsx
│
├── modules/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   └── auth.types.ts
│   ├── users/
│   │   ├── users.service.ts
│   │   ├── users.repository.ts
│   │   └── users.types.ts
│   ├── alumnos/
│   │   ├── alumnos.service.ts
│   │   ├── alumnos.repository.ts
│   │   └── alumnos.types.ts
│   ├── docentes/
│   ├── academic/
│   │   ├── periodos.service.ts
│   │   ├── bimestres.service.ts
│   │   ├── cursos.service.ts
│   │   ├── competencias.service.ts
│   │   ├── secciones.service.ts
│   │   ├── horarios.service.ts
│   │   └── escala.service.ts
│   ├── asistencias/
│   ├── notas/
│   ├── libretas/
│   ├── materiales/
│   ├── actividades/
│   ├── pagos/
│   ├── vouchers/
│   ├── siagie/
│   │   ├── siagie.service.ts
│   │   ├── siagie.repository.ts
│   │   └── siagie-excel.builder.ts
│   ├── dashboard/
│   ├── auditoria/
│   └── notificaciones/
│
├── lib/
│   ├── prisma.ts                  # PrismaClient singleton
│   ├── jwt.ts                     # sign, verify, extract
│   ├── bcrypt.ts                  # hash, compare helpers
│   └── audit.ts                   # setCurrentUserId para trigger
│
├── middlewares/
│   ├── withAuth.ts                # verifica JWT
│   ├── withRole.ts                # verifica rol RBAC
│   └── withAuditContext.ts        # SET app.current_user_id
│
├── schemas/
│   ├── auth.schema.ts
│   ├── alumnos.schema.ts
│   ├── docentes.schema.ts
│   ├── academic.schema.ts
│   ├── notas.schema.ts
│   ├── pagos.schema.ts
│   ├── vouchers.schema.ts
│   └── siagie.schema.ts
│
├── services/
│   └── storage.service.ts         # Supabase Storage
│
├── repositories/
│   └── (implementaciones por módulo)
│
├── types/
│   ├── api.ts                     # ApiResponse<T>
│   ├── auth.ts
│   ├── roles.ts                   # RolUsuario enum TS
│   └── database.ts                # tipos derivados de Prisma
│
├── utils/
│   ├── response.ts                # ok(), error(), paginate()
│   ├── errors.ts                  # AppError y subclases
│   └── pagination.ts
│
├── config/
│   └── env.ts                     # z.parse de process.env
│
├── storage/
│   └── buckets.ts                 # constantes de buckets
│
├── emails/
│   └── templates/
│
├── excel/
│   └── siagie.builder.ts          # ExcelJS builder
│
├── pdf/
│   └── libreta.builder.ts
│
├── errors/
│   └── http-errors.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/                # solo para tracking
│
└── .env.example
```

---

## 4. MAPEO DE PANTALLAS A BACKEND

### `/login`
- **Rol:** público
- **Datos que carga:** ninguno (estático)
- **Acciones:** login con email + contraseña + rol seleccionado
- **Endpoint:** `POST /api/auth/login`
- **Tablas:** `auth_schema.credencial`, `auth_schema.perfil_usuario`
- **Reglas:** máx 5 intentos, bloqueo por `bloqueado_hasta`, bcrypt compare
- **Respuesta:** `{ token, user: { id, rol, nombre } }` + cookie HttpOnly
- **Auditoría:** INSERT en `sesion_auditoria` tipo `LOGIN`

### `/alumno/inicio`
- **Rol:** Alumno
- **Endpoint:** `GET /api/dashboard/alumno`
- **Datos:** cursos activos con promedio actual, actividades próximas, estado de pagos, estado libreta
- **Tablas/vistas:** `mv_libreta_alumno`, `actividad`, `financial_schema.pago`, `fn_bloquea_libreta()`

### `/alumno/cursos`
- **Rol:** Alumno
- **Endpoint:** `GET /api/alumnos/:id/cursos`
- **Datos:** lista de asignaciones de la sección del alumno con horario, promedio por curso, actividades pendientes
- **Tablas:** `asignacion_docente`, `horario`, `mv_libreta_alumno`, `actividad`, `entrega_actividad`

### `/alumno/cursos/[cursoId]`
- **Rol:** Alumno
- **Endpoint:** `GET /api/cursos/:id/detalle?alumnoId=...`
- **Datos:** materiales, actividades, entregas del alumno, notas por competencia
- **Tablas:** `material`, `actividad`, `entrega_actividad`, `nota`, `competencia`

### `/alumno/libreta`
- **Rol:** Alumno
- **Endpoint:** `GET /api/libretas/:alumnoId?bimestreId=...`
- **Datos:** consulta `mv_libreta_alumno` — si `bloquea_libreta=TRUE`, responde 403 con mensaje de deuda
- **Endpoint PDF:** `GET /api/libretas/:alumnoId/pdf?bimestreId=...`
- **Auditoría:** evento `READ_SENSITIVE` al descargar PDF

### `/alumno/asistencias`
- **Rol:** Alumno
- **Endpoint:** `GET /api/asistencias/alumnos?alumnoId=...&mes=...`
- **Datos:** `v_resumen_asistencia` — total presentes/faltas/tardanzas y % por curso

### `/alumno/pagos`
- **Rol:** Alumno
- **Endpoints:** 
  - `GET /api/alumnos/:id/pagos` — historial mensual
  - `POST /api/vouchers` — subir comprobante (multipart)
- **Tablas:** `v_estado_pagos_alumno`, `boleta_pago`
- **Regla:** al subir boleta, el trigger `tg_boleta_insertada` cambia pago a `En_Revision`

### `/docente/inicio`
- **Rol:** Docente
- **Endpoint:** `GET /api/dashboard/docente`
- **Datos:** secciones a cargo, tareas pendientes por calificar, total estudiantes, % notas ingresadas

### `/docente/asistencia`
- **Rol:** Docente
- **Endpoints:**
  - `GET /api/asistencias/alumnos?seccionId=...&fecha=...` — carga lista para pasar asistencia
  - `POST /api/asistencias/alumnos` — guarda lote de asistencias (P/F/T/J)
- **Tablas:** `alumno`, `asistencia`
- **Regla:** un registro por alumno por sección por día (UNIQUE constraint)

### `/docente/tareas-materiales`
- **Rol:** Docente
- **Endpoints:**
  - `GET /api/materiales?docenteId=...&seccionId=...`
  - `POST /api/materiales` (multipart con archivo)
  - `GET /api/actividades?docenteId=...&seccionId=...`
  - `POST /api/actividades`
  - `GET /api/actividades/:id/entregas` — ver entregas de alumnos
  - `PATCH /api/actividades/entregas/:id` — calificar entrega
- **Tablas:** `material`, `actividad`, `entrega_actividad`

### `/docente/notas`
- **Rol:** Docente
- **Endpoints:**
  - `GET /api/notas?docenteId=...&seccionId=...&bimestreId=...&cursoId=...`
  - `POST /api/notas` — crear nota (trigger calcula nota_literal)
  - `PUT /api/notas/:id` — editar nota (solo si no cerrada)
- **Tablas:** `nota`, `alumno`, `competencia`, `bimestre`
- **Regla:** bimestre no cerrado, alumno de la sección asignada al docente

### `/admin/inicio`
- **Rol:** Admin
- **Endpoint:** `GET /api/dashboard/admin`
- **Datos:** estudiantes matriculados, docentes activos, % asistencia hoy, libretas bloqueadas, promedio por grado, estado pagos

### `/admin/cuentas`
- **Rol:** Admin
- **Endpoints:**
  - `GET /api/usuarios`
  - `POST /api/usuarios` — crear cuenta
  - `PATCH /api/usuarios/:id/desactivar`
  - `PATCH /api/usuarios/:id/activar`
- **Tablas:** `credencial`, `perfil_usuario`, `docente`

### `/admin/horarios`
- **Rol:** Admin
- **Endpoints:**
  - `GET /api/horarios?periodoId=...`
  - `POST /api/horarios` — crear bloque (trigger valida cruce)
  - `DELETE /api/horarios/:id`
- **Tablas:** `horario`, `asignacion_docente`
- **Regla:** trigger `tg_validar_cruce_horario` en PostgreSQL

### `/admin/asistencia-docente`
- **Rol:** Admin
- **Endpoints:**
  - `GET /api/asistencias/docentes?fecha=...`
  - `POST /api/asistencias/docentes` — guardar lote
- **Tablas:** `asistencia_docente`, `docente`

### `/admin/bloqueos`
- **Rol:** Admin
- **Endpoints:**
  - `GET /api/alumnos?bloqueados=true`
  - `PATCH /api/alumnos/:id/bloqueo` — toggle `bloqueo_manual`
- **Tablas:** `alumno`

### `/admin/periodos`
- **Rol:** Admin
- **Endpoints:**
  - `GET /api/periodos`
  - `POST /api/periodos`
  - `PATCH /api/periodos/:id/activar` — trigger desactiva los demás
- **Tablas:** `periodo_academico`

### `/admin/bimestres`
- **Rol:** Admin
- **Endpoints:**
  - `GET /api/bimestres?periodoId=...`
  - `POST /api/bimestres`
  - `PATCH /api/bimestres/:id/cerrar` — trigger cierra todas las notas
- **Tablas:** `bimestre`, `nota`

### `/admin/escala-calificaciones`
- **Rol:** Admin
- **Endpoints:**
  - `GET /api/escala-calificaciones?periodoId=...`
  - `PUT /api/escala-calificaciones/:id`
  - `GET /api/escala-calificaciones/verificar?periodoId=...`
- **Tablas:** `config_escala_literal`
- **Regla:** cobertura 0-20 sin superposiciones, 4 filas (AD, A, B, C)

### `/admin/institucion`
- **Rol:** Admin
- **Endpoints:**
  - `GET /api/institucion`
  - `PUT /api/institucion/:id`
- **Tablas:** `institucion_educativa`
- **Regla:** código modular 7 dígitos (requerido para SIAGIE)

### `/admin/competencias`
- **Rol:** Admin
- **Endpoints:**
  - `GET /api/competencias?cursoId=...&nivelId=...`
  - `POST /api/competencias`
  - `PUT /api/competencias/:id`
  - `DELETE /api/competencias/:id`
  - `PATCH /api/competencias/orden` — reordenar
- **Tablas:** `competencia`, `curso`

### `/secretaria/inicio`
- **Rol:** Secretaria
- **Endpoint:** `GET /api/dashboard/secretaria`
- **Datos:** vouchers pendientes, recaudado, deuda total, alumnos listos SIAGIE

### `/secretaria/alumnos`
- **Rol:** Secretaria
- **Endpoints:**
  - `GET /api/alumnos?nivel=...&grado=...&seccion=...&q=...`
  - `POST /api/alumnos` — crear alumno + credencial + perfil
  - `DELETE /api/alumnos/:id` — desactivar
- **Tablas:** `alumno`, `credencial`, `perfil_usuario`, `seccion`

### `/secretaria/vouchers`
- **Rol:** Secretaria
- **Endpoints:**
  - `GET /api/vouchers?estado=En_Revision`
  - `GET /api/vouchers/:id/archivo` — URL firmada Supabase Storage
  - `POST /api/vouchers/:id/aprobar` — llama SP `revisar_boleta`
  - `POST /api/vouchers/:id/rechazar` — llama SP con observación
- **Tablas:** `boleta_pago`, `pago`, `notificacion`

### `/secretaria/pagos`
- **Rol:** Secretaria
- **Endpoints:**
  - `GET /api/pagos?estado=...&q=...`
  - `POST /api/pagos/generar` — generar cuotas mensuales para alumnos
  - `PATCH /api/pagos/:id/marcar-pagado` — marcado manual
- **Tablas:** `v_estado_pagos_alumno`, `pago`, `concepto_pago`

### `/secretaria/siagie`
- **Rol:** Secretaria
- **Endpoints:**
  - `GET /api/siagie/preview?periodoId=...&bimestreId=...`
  - `GET /api/siagie/validar?periodoId=...`
  - `POST /api/siagie/generar` — genera Excel usando ExcelJS
  - `GET /api/siagie/historial`
- **Vistas:** `audit_schema.formato_siagie`
- **Tabla:** `audit_schema.integracion_siagie`

### `/secretaria/situacion-final`
- **Rol:** Secretaria
- **Endpoints:**
  - `GET /api/situacion-final?nivel=...&grado=...&seccion=...&q=...`
  - `PUT /api/situacion-final/:alumnoId` — registrar/actualizar situación
- **Tablas:** `situacion_final_alumno`

### `/notificaciones`
- **Rol:** Todos
- **Endpoints:**
  - `GET /api/notificaciones` — propias del usuario
  - `PATCH /api/notificaciones/:id/leer`
  - `PATCH /api/notificaciones/leer-todas`
- **Tablas:** `financial_schema.notificacion`

---

## 5. MÓDULOS DEL BACKEND

### Módulo: Auth
- **Responsabilidad:** login, logout, JWT, sesión, bloqueo
- **Tablas:** `credencial`, `perfil_usuario`, `sesion_auditoria`
- **Roles:** todos (público en login)
- **Endpoints:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- **Reglas críticas:**
  - Bloqueo tras 5 intentos (`intentos_fallidos >= 5` O `bloqueado_hasta > NOW()`)
  - Reset de intentos al login exitoso
  - JWT en cookie HttpOnly (ver sección 7)
  - Inactividad 30 minutos: el frontend limpia la cookie; el backend valida `iat`

### Módulo: Usuarios/Cuentas
- **Responsabilidad:** CRUD de cuentas de sistema (Admin gestiona)
- **Tablas:** `credencial`, `perfil_usuario`, más la tabla de la entidad (docente, alumno, etc.)
- **Roles:** Admin (escritura), Secretaria (lectura)
- **Reglas:** al desactivar → `activo=false` en credencial y en entidad; no eliminar física

### Módulo: Alumnos
- **Responsabilidad:** CRUD alumnos con credencial, asignación a sección/período
- **Tablas:** `alumno`, `credencial`, `perfil_usuario`, `seccion`
- **Roles:** Secretaria (CRUD), Admin (bloqueo_manual), Alumno (solo su propio perfil)
- **Reglas:** DNI 8 dígitos único, cupo_maximo de sección no superado, `codigo_siagie` puede ser null

### Módulo: Académico (Periodos, Bimestres, Escala, Niveles, Grados, Secciones, Cursos, Competencias, Horarios, Asignaciones)
- **Responsabilidad:** configuración de la estructura académica
- **Roles:** Admin (escritura total)
- **Reglas críticas:**
  - Solo 1 período activo (trigger `tg_un_periodo_activo`)
  - Escala debe cubrir 0-20 sin huecos ni superposiciones (verificación en backend antes de guardar)
  - Horario sin cruces (trigger `tg_validar_cruce_horario`)
  - Al cerrar bimestre → todas las notas se cierran (trigger `tg_cerrar_notas_bimestre`)

### Módulo: Notas
- **Responsabilidad:** registro, cierre y reapertura de notas
- **Tablas:** `nota`, `historial_nota`, `bimestre`, `config_escala_literal`
- **Roles:** Docente (registra/edita sus notas), Admin (reabre notas cerradas)
- **Reglas:**
  - `nota_vigesimal` 0-20 (trigger asigna `nota_literal` automáticamente)
  - No editar si `cerrada=TRUE` y `bimestre.cerrado=TRUE`
  - Reapertura requiere insert en `historial_nota` con motivo

### Módulo: Libretas
- **Responsabilidad:** consulta y descarga PDF de libreta digital
- **Tablas/vistas:** `mv_libreta_alumno`, `situacion_final_alumno`
- **Roles:** Alumno (propia), Admin/Secretaria (cualquier alumno)
- **Reglas:** si `bloquea_libreta=TRUE` → HTTP 403 con mensaje claro; auditoría de descarga

### Módulo: Asistencias
- **Responsabilidad:** asistencia de alumnos (Docente) y docentes (Admin)
- **Tablas:** `asistencia`, `asistencia_docente`
- **Roles:** Docente (alumnos de sus secciones), Admin (docentes)
- **Reglas:** UNIQUE por alumno+sección+fecha / docente+fecha; estados P/F/T/J

### Módulo: Materiales y Actividades
- **Responsabilidad:** subida de recursos y tareas, calificación de entregas
- **Tablas:** `material`, `actividad`, `entrega_actividad`
- **Roles:** Docente (CRUD), Alumno (ver+entregar)
- **Storage:** Supabase Storage, bucket `materiales` y `entregas`

### Módulo: Pagos y Vouchers
- **Responsabilidad:** gestión financiera, validación de comprobantes
- **Tablas:** `pago`, `boleta_pago`, `concepto_pago`, `notificacion`
- **SP:** `financial_schema.revisar_boleta` — invocado via `$queryRaw`
- **Roles:** Secretaria (CRUD pagos, validar vouchers), Alumno (ver sus pagos, subir voucher)
- **Reglas:** mora 5% acumulativa por cuota vencida; al aprobar boleta → pago pasa a `Pagado`; al rechazar → notificación automática

### Módulo: SIAGIE
- **Responsabilidad:** exportación de notas al formato oficial MINEDU
- **Vistas:** `audit_schema.formato_siagie` (materializada)
- **Tablas:** `integracion_siagie`
- **Roles:** Secretaria
- **Herramienta:** ExcelJS para generar el archivo .xlsx con la estructura del Acta 1

### Módulo: Dashboard
- **Responsabilidad:** KPIs por rol
- **Tablas/vistas:** múltiples — ver sección 17
- **Roles:** cada rol ve solo su dashboard

### Módulo: Auditoría
- **Responsabilidad:** registro de acciones sensibles
- **Tablas:** `sesion_auditoria`, `historial_nota`
- **Roles:** Admin (lectura), triggers (escritura automática)
- **Híbrido:** triggers SQL para DML en tablas sensibles + backend para LOGIN/LOGOUT/READ_SENSITIVE

---

## 6. ENDPOINTS REST

### Autenticación

```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
PATCH  /api/auth/change-password
```

**POST /api/auth/login**
```typescript
// Body
{ email: string, password: string, rol: "Admin"|"Secretaria"|"Docente"|"Alumno" }

// Respuesta 200
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "rol": "Docente", "nombre": "Ana García", "entidadId": "uuid" },
    "redirectTo": "/docente/inicio"
  }
}
// Set-Cookie: sgei_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=28800

// Error 401 - credenciales incorrectas
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "Credenciales incorrectas. Te quedan N intentos." }}

// Error 423 - cuenta bloqueada
{ "success": false, "error": { "code": "ACCOUNT_LOCKED", "message": "Cuenta bloqueada hasta [fecha]." }}
```

### Usuarios

```
GET    /api/usuarios?q=...&rol=...&activo=...&page=1&limit=20
POST   /api/usuarios
GET    /api/usuarios/:id
PATCH  /api/usuarios/:id
PATCH  /api/usuarios/:id/activar
PATCH  /api/usuarios/:id/desactivar
```

### Alumnos

```
GET    /api/alumnos?nivel=...&grado=...&seccion=...&q=...&page=1
POST   /api/alumnos
GET    /api/alumnos/:id
PUT    /api/alumnos/:id
DELETE /api/alumnos/:id
GET    /api/alumnos/:id/cursos
GET    /api/alumnos/:id/pagos
GET    /api/alumnos/:id/asistencias?mes=...&año=...
PATCH  /api/alumnos/:id/bloqueo   { bloqueo_manual: boolean }
```

### Docentes

```
GET    /api/docentes
POST   /api/docentes
GET    /api/docentes/:id
PUT    /api/docentes/:id
PATCH  /api/docentes/:id/desactivar
GET    /api/docentes/:id/asignaciones
GET    /api/docentes/:id/horario
```

### Institución

```
GET    /api/institucion
PUT    /api/institucion/:id
```

### Períodos y Bimestres

```
GET    /api/periodos
POST   /api/periodos
GET    /api/periodos/:id
PATCH  /api/periodos/:id/activar

GET    /api/bimestres?periodoId=...
POST   /api/bimestres
GET    /api/bimestres/:id
PUT    /api/bimestres/:id
PATCH  /api/bimestres/:id/cerrar
```

### Escala de Calificaciones

```
GET    /api/escala-calificaciones?periodoId=...
PUT    /api/escala-calificaciones/:id
GET    /api/escala-calificaciones/cobertura?periodoId=...
```

### Cursos y Competencias

```
GET    /api/cursos?nivelId=...
POST   /api/cursos
PUT    /api/cursos/:id

GET    /api/competencias?cursoId=...
POST   /api/competencias
PUT    /api/competencias/:id
DELETE /api/competencias/:id
PATCH  /api/competencias/reordenar   { competencias: [{id, orden}] }
```

### Asignaciones y Horarios

```
GET    /api/asignaciones?periodoId=...&seccionId=...&docenteId=...
POST   /api/asignaciones
DELETE /api/asignaciones/:id

GET    /api/horarios?periodoId=...&seccionId=...
POST   /api/horarios
DELETE /api/horarios/:id
```

### Asistencias

```
GET    /api/asistencias/alumnos?seccionId=...&fecha=...
POST   /api/asistencias/alumnos       { registros: [{alumnoId, estado, justificacion}] }

GET    /api/asistencias/docentes?fecha=...
POST   /api/asistencias/docentes      { registros: [{docenteId, estado, justificacion}] }
```

### Notas

```
GET    /api/notas?seccionId=...&cursoId=...&bimestreId=...
POST   /api/notas
PUT    /api/notas/:id
GET    /api/notas/historial/:notaId   -- Admin only
POST   /api/notas/:id/reabrir         -- Admin only, requiere motivo
```

### Libretas

```
GET    /api/libretas/:alumnoId?bimestreId=...
GET    /api/libretas/:alumnoId/pdf?bimestreId=...
```

### Materiales y Actividades

```
GET    /api/materiales?seccionId=...&cursoId=...
POST   /api/materiales                -- multipart/form-data
DELETE /api/materiales/:id

GET    /api/actividades?seccionId=...&cursoId=...
POST   /api/actividades
PUT    /api/actividades/:id
DELETE /api/actividades/:id

GET    /api/actividades/:id/entregas
PATCH  /api/actividades/entregas/:id  { nota, observacion_docente }

POST   /api/actividades/:id/entregar  -- Alumno entrega
```

### Pagos y Vouchers

```
GET    /api/pagos?alumnoId=...&estado=...&mes=...&periodoId=...
POST   /api/pagos/generar             { alumnoId, conceptoId, periodoId, meses: number[] }
PATCH  /api/pagos/:id/marcar-pagado

GET    /api/vouchers?estado=En_Revision
POST   /api/vouchers                  -- multipart/form-data, Alumno sube
GET    /api/vouchers/:id              -- Secretaria ve detalle
GET    /api/vouchers/:id/archivo      -- URL firmada Supabase Storage (300s)
POST   /api/vouchers/:id/aprobar
POST   /api/vouchers/:id/rechazar     { observacion_rechazo: string }
```

### SIAGIE

```
GET    /api/siagie/preview?periodoId=...&nivel=...
GET    /api/siagie/validar?periodoId=...
POST   /api/siagie/generar            { periodoId, nivelId?, gradoId?, seccionId? }
GET    /api/siagie/historial?page=1
```

### Dashboard

```
GET    /api/dashboard/admin
GET    /api/dashboard/secretaria
GET    /api/dashboard/docente
GET    /api/dashboard/alumno
```

### Notificaciones

```
GET    /api/notificaciones?leida=false&page=1
PATCH  /api/notificaciones/:id/leer
PATCH  /api/notificaciones/leer-todas
```

### Auditoría

```
GET    /api/auditoria?modulo=...&desde=...&hasta=...&usuarioId=...&page=1
```

---

## 7. AUTENTICACIÓN Y RBAC

### JWT en Cookie HttpOnly — Recomendación y razón

**Se recomienda JWT en Cookie HttpOnly** (no Authorization Bearer) para este sistema porque:
- Es una app web Next.js — el frontend y backend comparten el mismo dominio
- Las cookies HttpOnly son inaccesibles desde JavaScript → protege contra XSS
- Con `SameSite=Strict` se previene CSRF en operaciones sensibles
- Next.js Route Handlers pueden leer cookies directamente con `cookies()` de `next/headers`
- Evita que el token quede expuesto en `localStorage` (vulnerable a XSS)

### Configuración de la cookie
```typescript
// lib/jwt.ts
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const SECRET = process.env.JWT_SECRET!
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'
const COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'sgei_token'

export interface JwtPayload {
  sub: string          // credencial.id
  perfilId: string     // perfil_usuario.id
  rol: RolUsuario
  entidadId: string
  entidadTipo: string
  iat: number
  exp: number
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload
}

export function getTokenFromRequest(): string | null {
  const cookieStore = cookies()
  return cookieStore.get(COOKIE_NAME)?.value ?? null
}
```

### Flujo completo de Login
```typescript
// modules/auth/auth.service.ts
export async function login(email: string, password: string) {
  // 1. Buscar credencial por usuario_login
  const cred = await AuthRepository.findByLogin(email)
  if (!cred) throw new UnauthorizedError('INVALID_CREDENTIALS')

  // 2. Verificar bloqueo
  if (cred.bloqueado_hasta && cred.bloqueado_hasta > new Date()) {
    throw new UnauthorizedError('ACCOUNT_LOCKED', { bloqueado_hasta: cred.bloqueado_hasta })
  }

  // 3. Verificar cuenta activa
  if (!cred.activo) throw new UnauthorizedError('ACCOUNT_INACTIVE')

  // 4. Comparar contraseña
  const valid = await bcrypt.compare(password, cred.password_hash)
  if (!valid) {
    await AuthRepository.incrementFailedAttempts(cred.id)
    // si intentos >= 5, bloquear
    throw new UnauthorizedError('INVALID_CREDENTIALS')
  }

  // 5. Reset intentos y actualizar ultimo_acceso
  await AuthRepository.resetFailedAttempts(cred.id)

  // 6. Obtener perfil
  const perfil = await AuthRepository.getPerfilByCredencial(cred.id)

  // 7. Generar JWT
  const token = signToken({
    sub: cred.id,
    perfilId: perfil.id,
    rol: perfil.rol,
    entidadId: perfil.entidad_id,
    entidadTipo: perfil.entidad_tipo
  })

  // 8. Auditoría
  await AuditService.log({ usuarioId: perfil.id, tipo: 'LOGIN', modulo: 'auth', entidadAfectada: 'credencial', entidadId: cred.id })

  return { token, perfil }
}
```

### Middleware de protección
```typescript
// middlewares/withAuth.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { UnauthorizedError } from '@/errors/http-errors'

export type AuthenticatedHandler = (
  req: NextRequest,
  context: { user: JwtPayload; params?: any }
) => Promise<NextResponse>

export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, context: any) => {
    const token = req.cookies.get(process.env.JWT_COOKIE_NAME!)?.value
    if (!token) return errorResponse(new UnauthorizedError('TOKEN_MISSING'))
    
    try {
      const user = verifyToken(token)
      // Setear para trigger de auditoría
      await prisma.$executeRaw`SET LOCAL app.current_user_id = ${user.perfilId}`
      return handler(req, { ...context, user })
    } catch {
      return errorResponse(new UnauthorizedError('TOKEN_INVALID'))
    }
  }
}
```

### RBAC Helpers
```typescript
// middlewares/withRole.ts
export function withRole(...roles: RolUsuario[]) {
  return (handler: AuthenticatedHandler): AuthenticatedHandler => {
    return async (req, context) => {
      if (!roles.includes(context.user.rol)) {
        return errorResponse(new ForbiddenError('INSUFFICIENT_ROLE'))
      }
      return handler(req, context)
    }
  }
}

// Helpers de negocio
export function canAccessAlumno(user: JwtPayload, alumnoId: string): boolean {
  if (['Admin', 'Secretaria'].includes(user.rol)) return true
  if (user.rol === 'Alumno') return user.entidadId === alumnoId
  return false
}

export function canManageNota(user: JwtPayload, docenteId: string): boolean {
  if (user.rol === 'Admin') return true
  if (user.rol === 'Docente') return user.entidadId === docenteId
  return false
}

export function canDownloadLibreta(user: JwtPayload, alumnoId: string): boolean {
  return canAccessAlumno(user, alumnoId)
}

export function canExportSiagie(user: JwtPayload): boolean {
  return ['Admin', 'Secretaria'].includes(user.rol)
}

export function canValidateVoucher(user: JwtPayload): boolean {
  return ['Admin', 'Secretaria'].includes(user.rol)
}
```

---

## 8. PRISMA ORM

### Configuración con multi-schema
```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  schemas   = ["auth_schema", "academic_schema", "financial_schema", "audit_schema"]
}

// ─── ENUMs ───────────────────────────────────────────────────────────────────
enum RolUsuario {
  Admin
  Secretaria
  Docente
  Alumno
  @@schema("auth_schema")
}

enum EstadoAsistencia {
  P
  F
  T
  J
  @@schema("academic_schema")
}

enum NotaLiteral {
  AD
  A
  B
  C
  @@schema("academic_schema")
}

enum TipoMaterial {
  PDF
  enlace
  video
  imagen
  otro
  @@schema("academic_schema")
}

enum TipoActividad {
  tarea
  practica
  evaluacion
  proyecto
  @@schema("academic_schema")
}

enum EstadoEntrega {
  pendiente
  entregado
  calificado
  @@schema("academic_schema")
}

enum SituacionFinal {
  Promovido
  Repitente
  Retirado
  Trasladado
  Fallecido
  @@schema("academic_schema")
}

enum TipoEvaluacion {
  Final
  Recuperacion
  Ubicacion
  Estudio_Independiente
  @@schema("academic_schema")
}

enum EstadoPago {
  Pendiente
  En_Revision
  Pagado
  Rechazado
  @@schema("financial_schema")
}

enum EstadoRevisionBoleta {
  En_Revision
  Aprobada
  Rechazada
  @@schema("financial_schema")
}

enum TipoNotificacion {
  sistema
  pago
  academico
  comunicado
  @@schema("financial_schema")
}

enum EstadoIntegracion {
  exitoso
  error
  pendiente
  reintento
  @@schema("audit_schema")
}

// ─── MODELOS ─────────────────────────────────────────────────────────────────
model Credencial {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  usuario_login    String    @unique @db.VarChar(50)
  password_hash    String    @db.VarChar(255)
  activo           Boolean   @default(true)
  intentos_fallidos Int      @default(0) @db.SmallInt
  bloqueado_hasta  DateTime? @db.Timestamptz()
  ultimo_acceso    DateTime? @db.Timestamptz()
  created_at       DateTime  @default(now()) @db.Timestamptz()
  updated_at       DateTime  @default(now()) @db.Timestamptz()
  
  perfil           PerfilUsuario?

  @@map("credencial")
  @@schema("auth_schema")
}

model PerfilUsuario {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  credencial_id String    @unique @db.Uuid
  rol           RolUsuario
  entidad_tipo  String    @db.VarChar(30)
  entidad_id    String    @db.Uuid
  created_at    DateTime  @default(now()) @db.Timestamptz()

  credencial        Credencial        @relation(fields: [credencial_id], references: [id], onDelete: Cascade)
  notificaciones    Notificacion[]
  sesiones          SesionAuditoria[]

  @@map("perfil_usuario")
  @@schema("auth_schema")
}

model InstitucionEducativa {
  id                  String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  nombre              String  @db.VarChar(200)
  codigo_modular      String  @unique @db.VarChar(20)
  codigo_ugel         String  @db.VarChar(10)
  nombre_ugel         String  @db.VarChar(150)
  resolucion_creacion String? @db.VarChar(100)
  modalidad           String  @default("Educación Básica Regular") @db.VarChar(80)
  gestion             String  @db.VarChar(20)
  departamento        String  @db.VarChar(80)
  provincia           String  @db.VarChar(80)
  distrito            String  @db.VarChar(80)
  centro_poblado      String? @db.VarChar(100)
  direccion           String? @db.VarChar(255)
  telefono            String? @db.VarChar(15)
  email_institucional String? @db.VarChar(150)
  activo              Boolean @default(true)
  created_at          DateTime @default(now()) @db.Timestamptz()

  @@map("institucion_educativa")
  @@schema("academic_schema")
}

model PeriodoAcademico {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  año          Int      @db.SmallInt
  nombre       String   @db.VarChar(60)
  fecha_inicio DateTime @db.Date
  fecha_fin    DateTime @db.Date
  activo       Boolean  @default(false)
  created_at   DateTime @default(now()) @db.Timestamptz()

  bimestres Bimestre[]
  secciones Seccion[]
  alumnos   Alumno[]
  pagos     Pago[]

  @@unique([año])
  @@map("periodo_academico")
  @@schema("academic_schema")
}

model Alumno {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  perfil_usuario_id   String   @unique @db.Uuid
  seccion_id          String   @db.Uuid
  periodo_id          String   @db.Uuid
  dni                 String   @unique @db.Char(8)
  codigo_siagie       String?  @unique @db.VarChar(20)
  nombres             String   @db.VarChar(100)
  apellido_paterno    String   @db.VarChar(60)
  apellido_materno    String   @db.VarChar(60)
  fecha_nacimiento    DateTime @db.Date
  sexo                String   @db.Char(1)
  foto_url            String?
  direccion           String?  @db.VarChar(255)
  distrito            String?  @db.VarChar(100)
  telefono_emergencia String?  @db.VarChar(15)
  grupo_sanguineo     String?  @db.VarChar(5)
  condicion_especial  String?
  bloqueo_manual      Boolean  @default(false)
  activo              Boolean  @default(true)
  created_at          DateTime @default(now()) @db.Timestamptz()

  seccion  Seccion          @relation(fields: [seccion_id], references: [id])
  periodo  PeriodoAcademico @relation(fields: [periodo_id], references: [id])
  notas    Nota[]
  pagos    Pago[]

  @@unique([dni, periodo_id])
  @@map("alumno")
  @@schema("academic_schema")
}

model Nota {
  id              String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  alumno_id       String         @db.Uuid
  competencia_id  String         @db.Uuid
  bimestre_id     String         @db.Uuid
  docente_id      String         @db.Uuid
  nota_vigesimal  Decimal        @db.Decimal(4, 2)
  nota_literal    NotaLiteral
  tipo_evaluacion TipoEvaluacion @default(Final)
  cerrada         Boolean        @default(false)
  observacion     String?
  fecha_registro  DateTime       @default(now()) @db.Timestamptz()

  alumno      Alumno      @relation(fields: [alumno_id], references: [id])
  competencia Competencia @relation(fields: [competencia_id], references: [id])
  bimestre    Bimestre    @relation(fields: [bimestre_id], references: [id])
  docente     Docente     @relation(fields: [docente_id], references: [id])

  @@unique([alumno_id, competencia_id, bimestre_id])
  @@map("nota")
  @@schema("academic_schema")
}

model Pago {
  id                String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  alumno_id         String     @db.Uuid
  concepto_id       String     @db.Uuid
  periodo_id        String     @db.Uuid
  mes               Int?       @db.SmallInt
  monto             Decimal    @db.Decimal(10, 2)
  estado            EstadoPago @default(Pendiente)
  fecha_vencimiento DateTime   @db.Date
  fecha_pago        DateTime?  @db.Date
  generado_por      String     @db.Uuid
  created_at        DateTime   @default(now()) @db.Timestamptz()

  alumno   Alumno       @relation(fields: [alumno_id], references: [id])
  boleta   BoletaPago?

  @@map("pago")
  @@schema("financial_schema")
}

model BoletaPago {
  id                  String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  pago_id             String               @unique @db.Uuid
  url_archivo         String
  nombre_archivo      String?              @db.VarChar(200)
  banco               String?              @db.VarChar(80)
  numero_operacion    String?              @db.VarChar(50)
  estado_revision     EstadoRevisionBoleta @default(En_Revision)
  observacion_rechazo String?
  revisado_por        String?              @db.Uuid
  fecha_revision      DateTime?            @db.Timestamptz()
  fecha_subida        DateTime             @default(now()) @db.Timestamptz()

  pago Pago @relation(fields: [pago_id], references: [id], onDelete: Cascade)

  @@map("boleta_pago")
  @@schema("financial_schema")
}
```

### Estrategia de migraciones — Base ya creada por DDL
Dado que la base ya existe y fue creada por el DDL:

```bash
# NO usar prisma migrate dev (destruiría triggers y funciones)
# Usar introspección + baseline:

# 1. Introspetar esquema existente
npx prisma db pull

# 2. Ajustar el schema.prisma generado (agregar @@schema, mapeos)

# 3. Marcar el estado actual como baseline
npx prisma migrate resolve --applied "0_init"

# 4. Para cambios futuros: crear migraciones SQL manuales
# prisma/migrations/0001_descripcion/migration.sql
# Luego: npx prisma migrate deploy
```

### Cuándo usar Prisma Client vs `$queryRaw`
| Situación | Usar |
|-----------|------|
| CRUD simple en tablas sin joins complejos | Prisma Client |
| Consulta en vistas materializadas (`mv_libreta_alumno`, `formato_siagie`) | `$queryRaw` |
| Llamar Stored Procedure (`revisar_boleta`) | `$queryRaw` con `CALL` |
| Llamar funciones PL/pgSQL (`fn_bloquea_libreta`) | `$queryRaw` |
| Refresh de vista materializada | `$executeRaw` |
| Joins complejos con múltiples esquemas | `$queryRaw` |

```typescript
// Ejemplo: llamar SP revisar_boleta
await prisma.$executeRaw`
  CALL financial_schema.revisar_boleta(
    ${boletaId}::uuid,
    ${revisorId}::uuid,
    ${nuevoEstado}::financial_schema.estado_revision_boleta,
    ${observacion}
  )
`

// Ejemplo: consultar vista materializada
const libreta = await prisma.$queryRaw<LibretaRow[]>`
  SELECT * FROM academic_schema.mv_libreta_alumno
  WHERE alumno_id = ${alumnoId}::uuid
  AND bimestre = ${bimestreNumero}
  ORDER BY curso, competencia
`
```

---

## 9. VALIDACIONES ZOD

```typescript
// schemas/auth.schema.ts
import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Email institucional inválido'),
  password: z.string().min(6, 'Contraseña muy corta'),
  rol: z.enum(['Admin', 'Secretaria', 'Docente', 'Alumno'])
})

// schemas/alumnos.schema.ts
const DniSchema = z.string().regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos numéricos')

export const CreateAlumnoSchema = z.object({
  seccion_id: z.string().uuid(),
  periodo_id: z.string().uuid(),
  dni: DniSchema,
  codigo_siagie: z.string().max(20).optional().nullable(),
  nombres: z.string().min(2).max(100),
  apellido_paterno: z.string().min(2).max(60),
  apellido_materno: z.string().min(2).max(60),
  fecha_nacimiento: z.string().date(),
  sexo: z.enum(['M', 'F']),
  telefono_emergencia: z.string().regex(/^\d{9}$/).optional().nullable(),
  grupo_sanguineo: z.enum(['A+','A-','B+','B-','AB+','AB-','O+','O-']).optional().nullable(),
  condicion_especial: z.string().optional().nullable(),
  direccion: z.string().max(255).optional().nullable(),
  distrito: z.string().max(100).optional().nullable()
})

export const UpdateAlumnoSchema = CreateAlumnoSchema.partial()

// schemas/notas.schema.ts
export const CreateNotaSchema = z.object({
  alumno_id: z.string().uuid(),
  competencia_id: z.string().uuid(),
  bimestre_id: z.string().uuid(),
  nota_vigesimal: z.number().min(0).max(20),
  tipo_evaluacion: z.enum(['Final', 'Recuperacion', 'Ubicacion', 'Estudio_Independiente']).default('Final'),
  observacion: z.string().max(500).optional()
  // nota_literal la calcula el trigger — NO incluir en el body
})

export const CloseNotasSchema = z.object({
  bimestre_id: z.string().uuid()
})

// schemas/vouchers.schema.ts
export const UploadVoucherSchema = z.object({
  pago_id: z.string().uuid(),
  banco: z.string().max(80).optional(),
  numero_operacion: z.string().max(50).optional()
  // url_archivo viene del Storage
})

export const ValidateVoucherSchema = z.object({
  boleta_id: z.string().uuid()
})

export const RejectVoucherSchema = z.object({
  boleta_id: z.string().uuid(),
  observacion_rechazo: z.string().min(10, 'Debe especificar el motivo del rechazo')
})

// schemas/academic.schema.ts
export const CreateHorarioSchema = z.object({
  asignacion_id: z.string().uuid(),
  dia_semana: z.number().int().min(1).max(6),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/),
  aula: z.string().max(20).optional()
}).refine(d => d.hora_fin > d.hora_inicio, {
  message: 'hora_fin debe ser mayor que hora_inicio',
  path: ['hora_fin']
})

export const CreateEscalaCalificacionSchema = z.object({
  periodo_id: z.string().uuid(),
  escalas: z.array(z.object({
    id: z.string().uuid(),
    escala: z.enum(['AD', 'A', 'B', 'C']),
    rango_inferior: z.number().min(0).max(20),
    rango_superior: z.number().min(0).max(20)
  })).length(4)
}).refine(data => {
  // Verificar cobertura completa 0-20 sin superposiciones
  const sorted = [...data.escalas].sort((a,b) => a.rango_inferior - b.rango_inferior)
  let current = 0
  for (const e of sorted) {
    if (e.rango_inferior !== current) return false
    current = e.rango_superior
  }
  return Math.abs(current - 20) < 0.01
}, { message: 'La escala debe cubrir exactamente el rango 0-20 sin superposiciones' })

// schemas/siagie.schema.ts
export const GenerateSiagieSchema = z.object({
  periodo_id: z.string().uuid(),
  nivel_id: z.string().uuid().optional(),
  grado_id: z.string().uuid().optional(),
  seccion_id: z.string().uuid().optional()
})
```

---

## 10. SERVICIOS PRINCIPALES

### AuthService
```typescript
// modules/auth/auth.service.ts
export const AuthService = {
  login: async (email, password) => { /* ver sección 7 */ },
  logout: async (perfilId) => { /* auditoría LOGOUT */ },
  me: async (jwtPayload) => { /* retorna perfil + entidad */ },
  changePassword: async (credencialId, oldPass, newPass) => { /* bcrypt */ }
}
```

### NotaService
```typescript
// modules/notas/nota.service.ts
export const NotaService = {
  // El trigger tg_set_nota_literal calcula nota_literal automáticamente
  // El trigger tg_bloquear_nota_cerrada previene edición
  registrar: async (data: CreateNotaInput, user: JwtPayload) => {
    // 1. Verificar que docente tiene asignacion_docente para esa sección+curso+período
    // 2. Verificar que el bimestre NO está cerrado
    // 3. INSERT — el trigger calcula nota_literal
    // 4. Auditoría
  },
  editar: async (notaId, data, user) => {
    // 1. Si nota.cerrada=TRUE: solo Admin puede editar, requiere historial
    // 2. Si docente: solo puede editar sus propias notas no cerradas
  },
  reabrirNota: async (notaId, motivo, adminId) => {
    // 1. Solo Admin
    // 2. UPDATE nota SET cerrada=FALSE
    // 3. INSERT historial_nota con motivo
  }
}
```

### VoucherService
```typescript
// modules/vouchers/voucher.service.ts
export const VoucherService = {
  subir: async (pagoId, archivo, metadata, alumnoId) => {
    // 1. Verificar que el pago pertenece al alumno
    // 2. Verificar que no existe boleta_pago para ese pago (UNIQUE)
    // 3. Subir archivo a Supabase Storage bucket 'vouchers'
    // 4. INSERT boleta_pago → trigger tg_boleta_insertada cambia pago a En_Revision
    // 5. Notificar a Secretaría
  },
  aprobar: async (boletaId, revisorId) => {
    // CALL financial_schema.revisar_boleta(boletaId, revisorId, 'Aprobada', NULL)
  },
  rechazar: async (boletaId, revisorId, observacion) => {
    // CALL financial_schema.revisar_boleta(boletaId, revisorId, 'Rechazada', observacion)
    // El SP genera la notificación al alumno automáticamente
  },
  getSignedUrl: async (boletaId, revisarPermiso) => {
    // Supabase Storage: createSignedUrl con 300 segundos
  }
}
```

### SiagieExportService
```typescript
// modules/siagie/siagie.service.ts
export const SiagieExportService = {
  preview: async (periodoId) => {
    // Consulta formato_siagie para contar alumnos, con/sin notas, listos
    // Retorna: { totalAlumnos, conNotas, conAsistencia, listosExportar }
  },
  validar: async (periodoId) => {
    // Verifica: institucion con codigo_modular, todos bimestres con notas completas
    // Retorna lista de errores/advertencias
  },
  generar: async (periodoId, filtros, revisorId) => {
    // 1. REFRESH MATERIALIZED VIEW CONCURRENTLY audit_schema.formato_siagie
    // 2. Consultar audit_schema.formato_siagie
    // 3. Construir Excel con ExcelJS (ver sección 15)
    // 4. INSERT integracion_siagie
    // 5. Auditoría
    // 6. Retornar Buffer del Excel
  }
}
```

### LibretaService
```typescript
// modules/libretas/libreta.service.ts
export const LibretaService = {
  get: async (alumnoId, bimestreId, user) => {
    // 1. Verificar acceso (canAccessAlumno)
    // 2. Consultar mv_libreta_alumno
    // 3. Si bloquea_libreta=TRUE y user.rol='Alumno' → throw LibretaBloqueadaError
  },
  generarPDF: async (alumnoId, bimestreId, user) => {
    // 1. Verificar acceso y bloqueo
    // 2. Obtener datos de mv_libreta_alumno
    // 3. Generar PDF con datos: IE, alumno, grado/sección, notas por curso+competencia
    // 4. Auditoría READ_SENSITIVE
    // 5. Retornar Buffer
  }
}
```

---

## 11. REPOSITORIOS

```typescript
// modules/auth/auth.repository.ts
export const AuthRepository = {
  findByLogin: (login: string) =>
    prisma.credencial.findUnique({ where: { usuario_login: login } }),
  
  incrementFailedAttempts: async (id: string) => {
    const updated = await prisma.credencial.update({
      where: { id },
      data: { intentos_fallidos: { increment: 1 } },
      select: { intentos_fallidos: true }
    })
    if (updated.intentos_fallidos >= 5) {
      await prisma.credencial.update({
        where: { id },
        data: { bloqueado_hasta: new Date(Date.now() + 30 * 60 * 1000) } // 30 min
      })
    }
  },

  resetFailedAttempts: (id: string) =>
    prisma.credencial.update({
      where: { id },
      data: { intentos_fallidos: 0, bloqueado_hasta: null, ultimo_acceso: new Date() }
    }),

  getPerfilByCredencial: (credencialId: string) =>
    prisma.perfilUsuario.findUnique({ where: { credencial_id: credencialId } })
}

// modules/notas/nota.repository.ts
export const NotaRepository = {
  findByAlumnoBimestre: (alumnoId: string, bimestreId: string) =>
    prisma.nota.findMany({
      where: { alumno_id: alumnoId, bimestre_id: bimestreId },
      include: { competencia: { include: { curso: true } } }
    }),

  // Para la libreta usamos la vista materializada
  getLibretaMV: (alumnoId: string, bimestre?: number) =>
    prisma.$queryRaw<MvLibretaRow[]>`
      SELECT * FROM academic_schema.mv_libreta_alumno
      WHERE alumno_id = ${alumnoId}::uuid
      ${bimestre ? prisma.sql`AND bimestre = ${bimestre}` : prisma.sql``}
      ORDER BY curso, competencia, bimestre
    `
}

// modules/siagie/siagie.repository.ts
export const SiagieRepository = {
  getFormatoSiagie: (periodoId: string, filtros?: SiagieFilter) =>
    prisma.$queryRaw<FormatoSiagieRow[]>`
      SELECT * FROM audit_schema.formato_siagie
      WHERE periodo_id = ${periodoId}::uuid
      ORDER BY grado, seccion, apellido_paterno, apellido_materno, nombres, curso, numero_bimestre
    `,

  refreshMV: () =>
    prisma.$executeRaw`
      REFRESH MATERIALIZED VIEW CONCURRENTLY audit_schema.formato_siagie
    `,

  registrarIntegracion: (data: IntegracionSiagieInput) =>
    prisma.$executeRaw`
      INSERT INTO audit_schema.integracion_siagie 
        (entidad, entidad_id, accion, payload_enviado, estado)
      VALUES (${data.entidad}, ${data.entidadId}::uuid, ${data.accion}::audit_schema.accion_integracion, ${JSON.stringify(data.payload)}::jsonb, 'exitoso'::audit_schema.estado_integracion)
    `
}
```

---

## 12. SUPABASE STORAGE

### Configuración de buckets
```typescript
// storage/buckets.ts
export const BUCKETS = {
  VOUCHERS: process.env.SUPABASE_STORAGE_BUCKET_VOUCHERS!,    // 'sgei-vouchers'
  MATERIALES: process.env.SUPABASE_STORAGE_BUCKET_MATERIALS!, // 'sgei-materiales'
  ENTREGAS: process.env.SUPABASE_STORAGE_BUCKET_ENTREGAS!,    // 'sgei-entregas'
  FOTOS: 'sgei-fotos'
} as const

// Todos los buckets: PRIVADOS (no public)
```

### StorageService
```typescript
// services/storage.service.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const StorageService = {
  uploadVoucher: async (file: Buffer, alumnoId: string, pagoId: string, mimeType: string) => {
    // Validar: solo JPG, PNG, PDF
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf']
    if (!validTypes.includes(mimeType)) throw new FileValidationError('INVALID_FILE_TYPE')
    
    // Validar tamaño: máx 5MB
    const maxBytes = parseInt(process.env.MAX_FILE_SIZE_MB!) * 1024 * 1024
    if (file.length > maxBytes) throw new FileValidationError('FILE_TOO_LARGE')

    const path = `${alumnoId}/${pagoId}/${Date.now()}.${mimeType.split('/')[1]}`
    const { data, error } = await supabase.storage
      .from(BUCKETS.VOUCHERS)
      .upload(path, file, { contentType: mimeType, upsert: false })
    
    if (error) throw new StorageError(error.message)
    return data.path
  },

  getSignedUrl: async (bucket: string, path: string, expiresIn = 300) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)
    if (error) throw new StorageError(error.message)
    return data.signedUrl
  },

  uploadMaterial: async (file: Buffer, docenteId: string, seccionId: string, mimeType: string, filename: string) => {
    const path = `${docenteId}/${seccionId}/${Date.now()}-${filename}`
    // Tipos permitidos: PDF, DOCX, XLSX, imágenes
    const { data, error } = await supabase.storage
      .from(BUCKETS.MATERIALES)
      .upload(path, file, { contentType: mimeType })
    if (error) throw new StorageError(error.message)
    return data.path
  },

  deleteFile: async (bucket: string, path: string) => {
    await supabase.storage.from(bucket).remove([path])
  }
}
```

---

## 13. LIBRETAS DIGITALES

### Flujo completo

```
Alumno solicita libreta
       │
       ▼
GET /api/libretas/:alumnoId?bimestreId=...
       │
       ▼
1. Verificar JWT y pertenencia (canDownloadLibreta)
       │
       ▼
2. Consultar mv_libreta_alumno WHERE alumno_id = ? AND bimestre = ?
       │
       ▼
3. Verificar bloquea_libreta (campo en la MV)
   - Si TRUE y rol=Alumno → HTTP 403 { code: 'LIBRETA_BLOQUEADA', message: 'Tiene pagos pendientes. Regularice su situación.' }
   - Si TRUE y rol=Admin/Secretaria → retornar con flag bloqueada=true pero permitir vista
       │
       ▼
4. Retornar datos agrupados por curso > competencia > bimestre
```

### Estructura de respuesta
```typescript
interface LibretaResponse {
  alumno: { nombre: string; dni: string; grado: string; seccion: string }
  periodo: string
  bimestre: number
  bloqueada: boolean
  cursos: Array<{
    nombre: string
    competencias: Array<{
      nombre: string
      tipo: 'regular' | 'transversal'
      bimestres: Record<number, { vigesimal: number; literal: 'AD'|'A'|'B'|'C' }>
      promedio: number
    }>
    promedioGeneral: number
    escalaGeneral: 'AD'|'A'|'B'|'C'
  }>
  promedioTotal: number
  escalaTotal: 'AD'|'A'|'B'|'C'
}
```

### Generación PDF
```typescript
// pdf/libreta.builder.ts
import PDFDocument from 'pdfkit'

export async function generarLibretaPDF(data: LibretaResponse): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []
    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Encabezado: nombre IE, logo (si existe en Storage)
    // Datos del alumno: nombre, DNI, grado, sección
    // Tabla: Área | Competencia | Bim I | Bim II | ... | Promedio | Escala
    // Pie de página: fecha de generación

    doc.end()
  })
}
```

---

## 14. NOTAS Y CIERRE ACADÉMICO

### Flujo de registro de notas
```
Docente ingresa nota (0-20)
       │
POST /api/notas
       │
       ▼
1. Validar: docente tiene asignacion_docente para esa sección+curso
2. Validar: bimestre.cerrado = FALSE
3. Validar: alumno pertenece a esa sección
4. INSERT nota (nota_literal calculada por trigger tg_set_nota_literal)
   - El trigger llama fn_vigesimal_to_literal que consulta config_escala_literal
5. Auditoría tg_audit_nota (automática por trigger)
```

### Flujo de cierre de bimestre
```
Admin cierra bimestre
       │
PATCH /api/bimestres/:id/cerrar
       │
       ▼
1. Solo Admin
2. UPDATE bimestre SET cerrado=TRUE
3. Trigger tg_cerrar_notas_bimestre → UPDATE nota SET cerrada=TRUE WHERE bimestre_id=?
4. REFRESH MATERIALIZED VIEW CONCURRENTLY academic_schema.mv_libreta_alumno
5. Auditoría manual: notificar que bimestre fue cerrado
6. Recomendar REFRESH de formato_siagie si todas las notas están completas
```

### Reapertura de nota (solo Admin)
```typescript
// Solo posible si el Admin desbloquea la nota primero
await prisma.$transaction(async (tx) => {
  // 1. Desbloquear nota temporalmente
  await tx.$executeRaw`UPDATE academic_schema.nota SET cerrada=FALSE WHERE id=${notaId}::uuid`
  
  // 2. Actualizar nota (trigger recalculará nota_literal)
  await tx.nota.update({ where: { id: notaId }, data: { nota_vigesimal: nuevaNota } })
  
  // 3. Volver a cerrar
  await tx.$executeRaw`UPDATE academic_schema.nota SET cerrada=TRUE WHERE id=${notaId}::uuid`
  
  // 4. Registrar en historial_nota
  await tx.$executeRaw`
    INSERT INTO audit_schema.historial_nota (nota_id, valor_anterior, literal_anterior, valor_nuevo, literal_nuevo, modificado_por, motivo)
    VALUES (${notaId}::uuid, ${valorAnterior}, ${literalAnterior}::academic_schema.nota_literal, ${nuevaNota}, ${nuevaLiteral}::academic_schema.nota_literal, ${adminId}::uuid, ${motivo})
  `
})
```

---

## 15. MÓDULO SIAGIE

### Estructura exacta del Excel (Acta 1 — fuente: archivo .xls analizado)

**Hoja:** `Acta 1` — única hoja del libro

**Cabecera institucional (filas 1-21):**
```
Fila 1:  Título: "ACTA CONSOLIDADA DE EVALUACIÓN DE EDUCACIÓN BÁSICA REGULAR..."
Fila 6:  "MINISTERIO DE EDUCACIÓN"
Fila 8:  Secciones: UGEL | IE | Período Lectivo | Inicio | Fin | Ubicación Geográfica
Fila 10: Datos: N°/Nombre IE | Áreas y Talleres Curriculares | Comportamiento | Situación Final
Fila 11: Código UGEL | Código Modular | Áreas | Talleres | NºÁreas Desaprobados | Prov.
Fila 12: Nombre UGEL | Resolución Creación | [Áreas A-J] | [Talleres K-O] | Dist.
Fila 14: Modalidad | Grado | Sección | Centro Poblado
Fila 15: Gestión | | Turno
Fila 16: Nº Orden | Código Estudiante | Apellidos y Nombres | Sexo | Evaluación | Final
```

**Columnas de datos por alumno (desde fila 23):**
| Col | Campo | Fuente en SGEI |
|-----|-------|----------------|
| 0 | Nº Orden | ROW_NUMBER() en formato_siagie |
| 1 | Código del Estudiante | `alumno.codigo_siagie` |
| 2-15 | Apellidos y Nombres | `apellido_paterno + apellido_materno + nombres` |
| 36 | Sexo H/M | `alumno.sexo` |
| 37 (A) | Matemática | `nota_literal` donde `curso.nombre = 'Matemática'` |
| 38 (B) | Comunicación | `nota_literal` donde `curso.nombre = 'Comunicación'` |
| 39 (C) | Idioma Extranjero | `nota_literal` donde `curso` contiene 'Idioma' |
| 40 (D) | Educación por el Arte | `nota_literal` donde `curso.nombre` contiene 'Arte' |
| 41 (E) | Ciencias Sociales | `nota_literal` donde `curso.nombre = 'Ciencias Sociales'` |
| 42 (F) | Persona, Familia y RR.HH. | `nota_literal` donde `curso.nombre` contiene 'Persona' |
| 43 (G) | Educación Física | `nota_literal` donde `curso.nombre = 'Educación Física'` |
| 44 (H) | Educación Religiosa | `nota_literal` donde `curso.nombre` contiene 'Religiosa' |
| 45 (I) | Ciencia, Tecnología y Ambiente | `nota_literal` donde `curso.nombre` contiene 'Ciencia' |
| 46 (J) | Educación para el Trabajo | `nota_literal` donde `curso.nombre` contiene 'Trabajo' |
| 47 (K) | Especialidad Ocupacional | `nota_literal` donde `curso.codigo_cneb` coincide |
| 48-52 | Talleres 1-5 | Vacío si no aplica |
| 53 | Nº Áreas Desaprobadas | `situacion_final_alumno.numero_areas_desaprobadas` |
| 54 | Comportamiento | `situacion_final_alumno.comportamiento` |
| 55 | Situación Final | `situacion_final_alumno.situacion_final` |
| 56 | Motivo del Retiro | `situacion_final_alumno.motivo_retiro` |
| 57 | Observaciones | `situacion_final_alumno.observaciones` |
| 58 | Evaluación (marcar X) | `nota.tipo_evaluacion` → X en columna correcta |

### Builder ExcelJS

```typescript
// excel/siagie.builder.ts
import ExcelJS from 'exceljs'
import { FormatoSiagieRow } from '@/types/siagie'

export async function buildSiagieExcel(
  rows: FormatoSiagieRow[],
  seccion: { grado: string; nombre: string; turno: string },
  ie: InstitucionEducativa,
  periodo: { fecha_inicio: string; fecha_fin: string; año: number }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const ws = workbook.addWorksheet('Acta 1')

  // ── Cabecera institucional ──
  ws.mergeCells('A1:BH1')  // aproximar columnas
  
  // Fila 1: título
  ws.getCell('M2').value = 'ACTA CONSOLIDADA DE EVALUACIÓN DE EDUCACIÓN BÁSICA REGULAR DEL NIVEL DE EDUCACIÓN SECUNDARIA - ' + periodo.año
  
  // Datos UGEL
  ws.getCell('A9').value = 'Código'
  ws.getCell('A13').value = ie.codigo_ugel
  ws.getCell('A12').value = ie.nombre_ugel
  
  // Datos IE
  ws.getCell('P12').value = ie.codigo_modular
  ws.getCell('P13').value = ie.resolucion_creacion
  ws.getCell('P15').value = ie.modalidad === 'Educación Básica Regular' ? 'EBR' : ie.modalidad
  ws.getCell('P16').value = ie.gestion === 'Privada' ? 'PR' : 'P'
  
  // Grado, Sección, Turno
  ws.getCell('X15').value = seccion.grado.replace(/[°º]/, '')
  ws.getCell('AC15').value = seccion.nombre
  ws.getCell('AC16').value = seccion.turno
  
  // Período
  ws.getCell('AM9').value = periodo.fecha_inicio
  ws.getCell('AS9').value = periodo.fecha_fin
  
  // Ubicación
  ws.getCell('BF9').value = ie.departamento
  ws.getCell('BF12').value = ie.provincia
  ws.getCell('BF13').value = ie.distrito
  ws.getCell('BF15').value = ie.centro_poblado || ''

  // ── Headers de columnas de alumnos (fila 22) ──
  // Nº Orden | Código | Apellidos y Nombres | Sexo | A | B | C | D | E | F | G | H | I | J | K... 
  
  // ── Datos de alumnos (desde fila 23) ──
  const alumnosAgrupados = agruparPorAlumno(rows)
  let fila = 23
  
  for (const alumno of alumnosAgrupados) {
    const row = ws.getRow(fila)
    row.getCell(1).value = alumno.numero_orden
    row.getCell(2).value = alumno.codigo_siagie || ''
    row.getCell(16).value = `${alumno.apellido_paterno} ${alumno.apellido_materno}, ${alumno.nombres}`
    row.getCell(37).value = alumno.sexo
    
    // Notas por área (escala literal AD/A/B/C)
    row.getCell(38).value = alumno.notas['Matemática'] || ''
    row.getCell(39).value = alumno.notas['Comunicación'] || ''
    row.getCell(40).value = alumno.notas['Idioma'] || ''
    row.getCell(41).value = alumno.notas['Arte'] || ''
    row.getCell(42).value = alumno.notas['Ciencias Sociales'] || ''
    row.getCell(43).value = alumno.notas['Persona'] || ''
    row.getCell(44).value = alumno.notas['Educación Física'] || ''
    row.getCell(45).value = alumno.notas['Ed. Religiosa'] || ''
    row.getCell(46).value = alumno.notas['Ciencia y Tecnología'] || ''
    row.getCell(47).value = alumno.notas['Ed. Trabajo'] || ''
    
    // Situación final
    row.getCell(54).value = alumno.numero_areas_desaprobadas
    row.getCell(55).value = alumno.comportamiento || ''
    row.getCell(56).value = alumno.situacion_final || 'Sin registrar'
    row.getCell(57).value = alumno.motivo_retiro || ''
    row.getCell(58).value = alumno.observaciones || ''
    
    // Tipo de evaluación: marcar X
    if (alumno.tipo_evaluacion === 'Final') row.getCell(59).value = 'X'
    else if (alumno.tipo_evaluacion === 'Recuperacion') row.getCell(60).value = 'X'
    
    row.commit()
    fila++
  }

  return workbook.xlsx.writeBuffer() as Promise<Buffer>
}
```

### Validaciones previas al generar
```typescript
// modules/siagie/siagie-validator.ts
export async function validarSiagie(periodoId: string): Promise<ValidationResult> {
  const errores: string[] = []
  const advertencias: string[] = []

  // 1. Verificar institución configurada con codigo_modular
  const ie = await prisma.institucionEducativa.findFirst({ where: { activo: true } })
  if (!ie) errores.push('No hay institución educativa activa configurada')
  if (!ie?.codigo_modular) errores.push('El código modular (7 dígitos) es obligatorio para SIAGIE')

  // 2. Verificar que hay alumnos en el período
  const totalAlumnos = await prisma.alumno.count({ where: { periodo_id: periodoId, activo: true } })
  if (totalAlumnos === 0) errores.push('No hay alumnos activos en el período seleccionado')

  // 3. Verificar notas completas
  const alumnos = await prisma.$queryRaw<{alumno_id: string; nombre: string; sin_notas: boolean}[]>`...`
  const sinNotas = alumnos.filter(a => a.sin_notas)
  if (sinNotas.length > 0) advertencias.push(`${sinNotas.length} alumnos sin notas completas`)

  // 4. Verificar escala configurada
  const escala = await prisma.$queryRaw`SELECT COUNT(*) FROM academic_schema.config_escala_literal WHERE periodo_id=${periodoId}::uuid`
  if (Number(escala[0].count) < 4) errores.push('La escala de calificaciones no está configurada completa (AD/A/B/C)')

  // 5. Verificar codigo_siagie (advertencia si falta)
  const sinCodigo = await prisma.alumno.count({ where: { periodo_id: periodoId, codigo_siagie: null } })
  if (sinCodigo > 0) advertencias.push(`${sinCodigo} alumnos sin código SIAGIE asignado`)

  return { errores, advertencias, puedeGenerar: errores.length === 0 }
}
```

---

## 16. SITUACIÓN FINAL

```typescript
// Endpoint: GET /api/situacion-final
// Filtros: nivel, grado, seccion, q (búsqueda por nombre/DNI)
// Retorna: alumnos con su situacion_final_alumno (o null si sin registrar)

interface SituacionFinalAlumno {
  alumno_id: string
  nombre: string
  dni: string
  grado: string
  seccion: string
  situacion_final: 'Promovido' | 'Repitente' | 'Retirado' | 'Trasladado' | 'Fallecido' | null
  numero_areas_desaprobadas: number
  comportamiento: string | null
  motivo_retiro: string | null
  observaciones: string | null
}

// Endpoint: PUT /api/situacion-final/:alumnoId
// Body:
{
  periodo_id: string
  situacion_final: SituacionFinal
  numero_areas_desaprobadas: number
  comportamiento?: string   // AD/A/B/C
  motivo_retiro?: string    // obligatorio si situacion=Retirado o Trasladado
  observaciones?: string
}
// Validación: si situacion=Retirado/Trasladado → motivo_retiro requerido
// Upsert: INSERT ON CONFLICT (alumno_id, periodo_id) DO UPDATE
```

---

## 17. DASHBOARD Y KPIs

### Admin `/api/dashboard/admin`
```typescript
// Consultas y endpoints
{
  estudiantes_matriculados: "COUNT(*) FROM alumno WHERE activo=TRUE AND periodo_id=activo",
  docentes_activos: "COUNT(*) FROM docente WHERE activo=TRUE",
  asistencia_hoy: "porcentaje P de asistencia WHERE fecha=TODAY",
  libretas_bloqueadas: "COUNT(*) FROM alumno WHERE fn_bloquea_libreta(id)=TRUE",
  promedio_por_grado: "AVG(nota_vigesimal) GROUP BY grado FROM mv_libreta_alumno",
  estado_pagos: "COUNT por estado FROM pago WHERE periodo_id=activo",
  vouchers_pendientes: "COUNT FROM boleta_pago WHERE estado_revision='En_Revision'"
}
```

### Secretaria `/api/dashboard/secretaria`
```typescript
{
  vouchers_pendientes: 5,           // boleta_pago WHERE estado='En_Revision'
  recaudado_periodo: 62800,         // SUM(monto) FROM pago WHERE estado='Pagado'
  deuda_total: 16400,               // SUM(monto) FROM pago WHERE estado IN ('Pendiente','Rechazado')
  listos_siagie: 116,               // COUNT FROM formato_siagie WHERE notas completas
  total_alumnos: 124
}
```

### Docente `/api/dashboard/docente`
```typescript
{
  secciones_cargo: 6,               // asignacion_docente WHERE docente_id=...
  tareas_pendientes_calificar: 23,  // entrega_actividad WHERE estado='entregado' y actividad del docente
  total_estudiantes: 168,           // SUM alumnos en sus secciones
  porcentaje_notas_ingresadas: 85   // notas ingresadas / (alumnos × competencias × bimestre_activo)
}
```

### Alumno `/api/dashboard/alumno`
```typescript
{
  bimestre_activo: { nombre: "Bimestre II", numero: 2 },
  cursos_activos: [...],            // asignaciones de la sección con promedio de mv_libreta_alumno
  actividades_proximas: [...],      // actividades WHERE fecha_limite > NOW() ORDER BY fecha_limite LIMIT 4
  estado_pagos: { pagado: 1400, pendiente: 2800, total: 4200 },
  libreta_bloqueada: false
}
```

---

## 18. AUDITORÍA

### Auditoría automática (triggers SQL)
Los triggers `tg_audit_nota`, `tg_audit_pago`, `tg_audit_boleta`, `tg_audit_credencial` registran automáticamente en `audit_schema.sesion_auditoria` para INSERT/UPDATE/DELETE.

**Requisito crítico:** antes de ejecutar cualquier operación de escritura desde el backend, se debe setear `app.current_user_id`:

```typescript
// lib/audit.ts
export async function withAuditContext<T>(
  perfilId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL app.current_user_id = ${perfilId}`
    return fn(tx)
  })
}
```

### Auditoría manual (backend)
```typescript
// modules/auditoria/audit.service.ts
export const AuditService = {
  log: async (data: {
    usuarioId: string
    tipo: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ_SENSITIVE' | 'LOGIN' | 'LOGOUT'
    modulo: string
    entidadAfectada: string
    entidadId?: string
    oldValue?: object
    newValue?: object
    ip?: string
    userAgent?: string
  }) => {
    await prisma.$executeRaw`
      INSERT INTO audit_schema.sesion_auditoria 
        (usuario_id, tipo_accion, modulo, entidad_afectada, entidad_id, old_value, new_value, ip_origen, user_agent)
      VALUES (
        ${data.usuarioId}::uuid,
        ${data.tipo}::auth_schema.tipo_accion_auditoria,
        ${data.modulo},
        ${data.entidadAfectada},
        ${data.entidadId || null}::uuid,
        ${data.oldValue ? JSON.stringify(data.oldValue) : null}::jsonb,
        ${data.newValue ? JSON.stringify(data.newValue) : null}::jsonb,
        ${data.ip || null}::inet,
        ${data.userAgent || null}
      )
    `
  }
}
```

**Eventos que deben auditarse manualmente (además de los triggers):**
- LOGIN / LOGOUT
- Descarga de libreta PDF (`READ_SENSITIVE`)
- Exportación SIAGIE (`READ_SENSITIVE`)
- Reapertura de nota (Admin)
- Bloqueo/desbloqueo de cuenta
- Bloqueo_manual de alumno

---

## 19. SEGURIDAD

```typescript
// Configuración de seguridad completa
const SECURITY_CONFIG = {
  bcrypt: { saltRounds: 12 },       // process.env.BCRYPT_SALT_ROUNDS
  jwt: {
    algorithm: 'HS256',
    expiresIn: '8h',
    cookieName: 'sgei_token',
    cookieOptions: {
      httpOnly: true,               // inaccesible desde JS
      secure: true,                 // solo HTTPS en producción
      sameSite: 'strict' as const,  // previene CSRF
      maxAge: 8 * 60 * 60          // 8 horas en segundos
    }
  },
  rateLimit: {
    login: { windowMs: 15 * 60 * 1000, max: 10 }  // 10 intentos por 15 min por IP
  }
}

// Headers de seguridad (next.config.js)
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
]
```

**Reglas críticas:**
- Nunca exponer `password_hash` en ninguna respuesta
- Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` al frontend
- Buckets de Storage: todos privados, solo URLs firmadas con TTL 300s
- RLS en Supabase como segunda capa (aunque el backend hace RBAC primario)
- Los archivos SIAGIE generados no deben guardarse en Storage — retornar directamente como stream y eliminar el Buffer inmediatamente
- Sanitizar todos los inputs antes de `$queryRaw` usando tagged template literals de Prisma

---

## 20. MANEJO DE ERRORES

```typescript
// errors/http-errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: object
  ) { super(message) }
}

export class ValidationError extends AppError {
  constructor(details: object) {
    super('VALIDATION_ERROR', 'Los datos enviados no son válidos', 400, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(code = 'UNAUTHORIZED', details?: object) {
    super(code, 'No autorizado', 401, details)
  }
}

export class ForbiddenError extends AppError {
  constructor(code = 'FORBIDDEN') {
    super(code, 'No tiene permisos para esta acción', 403)
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string) {
    super('NOT_FOUND', `${entity} no encontrado`, 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409)
  }
}

export class BusinessRuleError extends AppError {
  constructor(code: string, message: string, details?: object) {
    super(code, message, 422, details)
  }
}

export class LibretaBloqueadaError extends BusinessRuleError {
  constructor() {
    super('LIBRETA_BLOQUEADA', 'La libreta está bloqueada por pagos pendientes o bloqueo administrativo')
  }
}

export class SiagieValidationError extends BusinessRuleError {
  constructor(errores: string[]) {
    super('SIAGIE_VALIDATION_ERROR', 'El archivo SIAGIE no puede generarse', { errores })
  }
}

// utils/response.ts
export function ok<T>(data: T, message = 'OK', statusCode = 200): NextResponse {
  return NextResponse.json({ success: true, data, message }, { status: statusCode })
}

export function errorResponse(error: AppError | unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message, details: error.details } },
      { status: error.statusCode }
    )
  }
  // Error de PostgreSQL (trigger RAISE EXCEPTION)
  if (error instanceof Error && error.message.includes('cruce de horario')) {
    return NextResponse.json(
      { success: false, error: { code: 'SCHEDULE_CONFLICT', message: error.message } },
      { status: 422 }
    )
  }
  console.error('[SGEI Error]', error)
  return NextResponse.json(
    { success: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } },
    { status: 500 }
  )
}
```

**Ejemplos de errores específicos SGEI:**
```json
// Login incorrecto
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "Credenciales incorrectas. Te quedan 3 intentos." }}

// Cuenta bloqueada
{ "success": false, "error": { "code": "ACCOUNT_LOCKED", "message": "Cuenta bloqueada. Intente nuevamente después de las 15:30." }}

// Nota fuera de rango (Zod)
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Los datos enviados no son válidos", "details": { "nota_vigesimal": "La nota debe estar entre 0 y 20" }}}

// Horario con cruce (trigger PostgreSQL)
{ "success": false, "error": { "code": "SCHEDULE_CONFLICT", "message": "El docente tiene un cruce de horario el día 1 entre 08:00 y 09:00." }}

// Libreta bloqueada
{ "success": false, "error": { "code": "LIBRETA_BLOQUEADA", "message": "La libreta está bloqueada por pagos pendientes. Regularice su situación financiera." }}

// SIAGIE con datos incompletos
{ "success": false, "error": { "code": "SIAGIE_VALIDATION_ERROR", "message": "El archivo SIAGIE no puede generarse", "details": { "errores": ["8 alumnos sin notas en Bimestre II", "No hay código modular configurado"] }}}
```

---

## 21. VARIABLES DE ENTORNO

```bash
# .env.example

# ── Base de datos ──────────────────────────────────────────────
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
# DATABASE_URL usa pgbouncer para conexiones pooled (producción)
# DIRECT_URL sin pooler (para Prisma migrate)

# ── JWT ────────────────────────────────────────────────────────
JWT_SECRET="[mínimo 64 caracteres aleatorios]"
JWT_EXPIRES_IN="8h"
JWT_COOKIE_NAME="sgei_token"

# ── Seguridad ──────────────────────────────────────────────────
BCRYPT_SALT_ROUNDS=12

# ── Supabase ───────────────────────────────────────────────────
SUPABASE_URL="https://[PROJECT].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="[service role key — NUNCA exponer al frontend]"

# ── Storage buckets ────────────────────────────────────────────
SUPABASE_STORAGE_BUCKET_VOUCHERS="sgei-vouchers"
SUPABASE_STORAGE_BUCKET_MATERIALS="sgei-materiales"
SUPABASE_STORAGE_BUCKET_ACTIVIDADES="sgei-actividades"
SUPABASE_STORAGE_BUCKET_ENTREGAS="sgei-entregas"
SUPABASE_STORAGE_BUCKET_SIAGIE="sgei-siagie-temp"   # no se usa en producción (stream directo)

# ── Email ──────────────────────────────────────────────────────
RESEND_API_KEY="re_[key]"                           # opción 1: Resend
# O alternativamente SMTP:
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="notificaciones@colegio.edu.pe"
SMTP_PASS="[app password]"

# ── App ────────────────────────────────────────────────────────
APP_URL="https://sgei.colegio.edu.pe"               # producción
NEXT_PUBLIC_APP_URL="https://sgei.colegio.edu.pe"  # accesible en frontend

# ── Entorno ────────────────────────────────────────────────────
NODE_ENV="production"                               # development | production
RAILWAY_ENVIRONMENT="production"                    # development | staging | production

# ── Archivos ───────────────────────────────────────────────────
MAX_FILE_SIZE_MB=5                                  # vouchers, materiales
MAX_SIAGIE_FILE_SIZE_MB=50                          # no aplica (stream)
```

**Por entorno:**
- **Desarrollo:** `NODE_ENV=development`, `DATABASE_URL` apunta a Supabase staging o local
- **Staging:** `RAILWAY_ENVIRONMENT=staging`, mismos secrets en variables de Railway del entorno staging
- **Producción:** `NODE_ENV=production`, `BCRYPT_SALT_ROUNDS=12`, `JWT_SECRET` de mínimo 64 chars

---

## 22. DESPLIEGUE EN RAILWAY

```bash
# railway.json o configuración en dashboard

# Build command
npm run build

# Start command
npm start

# Health check
GET /api/health → { status: "ok", timestamp: "..." }
```

**Configuración crítica Railway:**
1. Todas las variables de `.env.example` → Variables de entorno en Railway (por entorno)
2. `DATABASE_URL` con `?pgbouncer=true&connection_limit=1` para pooling en serverless
3. `DIRECT_URL` sin pgbouncer para migraciones
4. En `package.json`:
```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

**Consideraciones para archivos temporales (Excel/PDF):**
- Los Buffers de Excel SIAGIE y PDF de libreta se generan en memoria (RAM) y se retornan como stream — NO se escriben a disco en producción
- Si el servidor tiene poca RAM, considerar generar en `/tmp` y limpiar inmediatamente
- Railway tiene sistema de archivos efímero — nunca persistir archivos en disco

```typescript
// Retornar Excel como stream en Route Handler
return new NextResponse(excelBuffer, {
  status: 200,
  headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="SIAGIE_${grado}_${seccion}_${año}.xlsx"`,
    'Content-Length': excelBuffer.length.toString()
  }
})
```

---

## 23. TESTING

```typescript
// Herramientas recomendadas
// - Vitest (más rápido que Jest, compatible con Next.js 14)
// - @testing-library/react para componentes
// - supertest o fetch nativo para Route Handlers
// - prisma-mock para mock de Prisma
// - vitest-mock-extended para TypeScript mocks

// tests/unit/auth.service.test.ts
describe('AuthService.login', () => {
  it('bloquea cuenta tras 5 intentos fallidos', async () => {
    // mock credencial con intentos_fallidos=4
    // llamar login con contraseña incorrecta
    // verificar que se llama incrementFailedAttempts
    // verificar que bloqueado_hasta se setea
  })
  it('retorna JWT válido al login exitoso', async () => { ... })
  it('lanza ACCOUNT_LOCKED si bloqueado_hasta es futuro', async () => { ... })
})

// tests/unit/nota.service.test.ts
describe('NotaService', () => {
  it('no permite registrar nota si bimestre está cerrado', async () => { ... })
  it('no permite que un docente registre notas de otro docente', async () => { ... })
})

// tests/unit/siagie.service.test.ts
describe('SiagieExportService', () => {
  it('falla si no hay codigo_modular configurado', async () => { ... })
  it('falla si hay alumnos sin notas', async () => { ... })
  it('genera buffer Excel válido con estructura correcta', async () => {
    const buffer = await SiagieExportService.generar(periodoId, {}, adminId)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })
})

// tests/integration/voucher.test.ts
describe('POST /api/vouchers', () => {
  it('cambia estado del pago a En_Revision al subir voucher', async () => { ... })
  it('rechaza archivos que no son JPG/PNG/PDF', async () => { ... })
})

// tests/integration/rbac.test.ts
describe('RBAC', () => {
  it('alumno no puede acceder a /api/notas de otro alumno', async () => { ... })
  it('docente no puede validar vouchers', async () => { ... })
  it('secretaria puede exportar SIAGIE', async () => { ... })
})
```

---

## 24. ORDEN DE IMPLEMENTACIÓN

### Fase 1 — Base
- `prisma/schema.prisma` con multiSchema completo
- `npx prisma db pull` + ajustes manuales
- `lib/prisma.ts` (singleton)
- `utils/response.ts` y `errors/http-errors.ts`
- `config/env.ts` con Zod
- `GET /api/health`
- Variables de entorno en Railway

### Fase 2 — Auth y usuarios
- `AuthService` + `AuthRepository` completo
- `POST /api/auth/login` con JWT en cookie HttpOnly
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `withAuth` middleware
- `withRole` middleware
- CRUD de usuarios (`/api/usuarios`)
- Tests de auth y RBAC

### Fase 3 — Estructura académica
- Institución educativa
- Períodos académicos (con trigger de único activo)
- Bimestres
- Escala de calificaciones (con validación de cobertura 0-20)
- Niveles, grados
- Cursos y competencias
- Secciones
- Asignaciones docente
- Horarios (trigger de cruces)

### Fase 4 — Alumnos y docentes
- CRUD completo de docentes (con credencial + perfil)
- CRUD completo de alumnos (con credencial + perfil)
- Asignación a sección/período
- Tests de creación de usuarios

### Fase 5 — Asistencias, materiales y actividades
- Asistencia de alumnos (Docente registra)
- Asistencia de docentes (Admin registra)
- Materiales con Supabase Storage
- Actividades
- Entregas de alumnos
- Calificación de entregas

### Fase 6 — Notas y libretas
- Registro de notas (con trigger nota_literal)
- Cierre de bimestre
- Historial de notas y reapertura
- Vista materializada `mv_libreta_alumno`
- `LibretaService` con bloqueo por deuda
- Generación de PDF de libreta

### Fase 7 — Pagos y vouchers
- Conceptos de pago
- Generación de cuotas
- Subida de vouchers a Storage
- Llamada al SP `revisar_boleta` para aprobar/rechazar
- Módulo de mora (cálculo 5%)
- Notificaciones internas

### Fase 8 — SIAGIE, situación final, dashboard
- Vista materializada `formato_siagie` y refresh
- Validación previa SIAGIE
- Builder ExcelJS con estructura exacta del Acta 1
- Situación final de alumnos
- Dashboards por rol con todas las consultas KPI
- Auditoría avanzada y consulta de historial

### Fase 9 — Testing, seguridad y producción
- Tests unitarios completos (Vitest)
- Tests de integración de endpoints críticos
- Rate limiting en login
- Headers de seguridad
- Revisión final de RLS en Supabase
- Despliegue en Railway con variables de entorno por entorno
- Monitoreo y logs

---

## 25. CONTRATOS DE INTEGRACIÓN FRONTEND-BACKEND

### Estructura frontend mínima

```typescript
// src/lib/api/client.ts
import axios from 'axios'

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_APP_URL + '/api',
  withCredentials: true,  // enviar cookies HttpOnly automáticamente
  headers: { 'Content-Type': 'application/json' }
})

apiClient.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// src/lib/api/auth.api.ts
export const authApi = {
  login: (data: LoginRequest) => apiClient.post<ApiResponse<LoginData>>('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get<ApiResponse<UserProfile>>('/auth/me')
}

// src/lib/api/notas.api.ts
export const notasApi = {
  listar: (params: NotasParams) => apiClient.get<ApiResponse<Nota[]>>('/notas', { params }),
  crear: (data: CreateNotaRequest) => apiClient.post<ApiResponse<Nota>>('/notas', data),
  editar: (id: string, data: Partial<CreateNotaRequest>) => apiClient.put(`/notas/${id}`, data)
}

// src/lib/api/siagie.api.ts
export const siagieApi = {
  preview: (periodoId: string) => apiClient.get<ApiResponse<SiagiePreview>>('/siagie/preview', { params: { periodoId } }),
  validar: (periodoId: string) => apiClient.get<ApiResponse<SiagieValidation>>('/siagie/validar', { params: { periodoId } }),
  generar: async (data: GenerateSiagieRequest) => {
    const res = await apiClient.post('/siagie/generar', data, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `SIAGIE_${new Date().getFullYear()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }
}
```

### TypeScript interfaces

```typescript
// src/types/api.ts
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiError {
  success: false
  error: { code: string; message: string; details?: object }
}

// src/types/auth.ts
export interface LoginRequest {
  email: string
  password: string
  rol: 'Admin' | 'Secretaria' | 'Docente' | 'Alumno'
}

export interface UserProfile {
  id: string
  rol: 'Admin' | 'Secretaria' | 'Docente' | 'Alumno'
  nombre: string
  entidadId: string
}

// src/types/nota.ts
export interface Nota {
  id: string
  alumno_id: string
  competencia_id: string
  bimestre_id: string
  nota_vigesimal: number
  nota_literal: 'AD' | 'A' | 'B' | 'C'
  tipo_evaluacion: 'Final' | 'Recuperacion' | 'Ubicacion' | 'Estudio_Independiente'
  cerrada: boolean
  observacion?: string
}

// src/types/pago.ts
export interface Pago {
  id: string
  alumno_id: string
  mes: number
  monto: number
  estado: 'Pendiente' | 'En_Revision' | 'Pagado' | 'Rechazado'
  fecha_vencimiento: string
  fecha_pago?: string
  estado_boleta?: 'En_Revision' | 'Aprobada' | 'Rechazada'
  observacion_rechazo?: string
}
```

### React Query Hooks

```typescript
// src/hooks/auth/useAuth.ts
import { useQuery, useMutation } from '@tanstack/react-query'
import { authApi } from '@/lib/api/auth.api'

export function useAuth() {
  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me().then(r => r.data.data),
    retry: false,
    staleTime: 5 * 60 * 1000
  })

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      const { rol } = res.data.data.user
      const routes = { Admin: '/admin/inicio', Secretaria: '/secretaria/inicio', Docente: '/docente/inicio', Alumno: '/alumno/inicio' }
      window.location.href = routes[rol]
    }
  })

  return { user: data, isLoading, login: loginMutation.mutate, loginError: loginMutation.error }
}

// src/hooks/docente/useIngresoNotas.ts
export function useIngresoNotas(params: NotasParams) {
  const query = useQuery({
    queryKey: ['notas', params],
    queryFn: () => notasApi.listar(params).then(r => r.data.data),
    enabled: !!params.seccionId && !!params.bimestreId
  })

  const crearNota = useMutation({
    mutationFn: notasApi.crear,
    onSuccess: () => query.refetch()
  })

  return { notas: query.data, isLoading: query.isLoading, crearNota: crearNota.mutate }
}

// src/hooks/secretaria/useSiagie.ts
export function useSiagie(periodoId: string) {
  const preview = useQuery({
    queryKey: ['siagie', 'preview', periodoId],
    queryFn: () => siagieApi.preview(periodoId).then(r => r.data.data)
  })

  const validar = useQuery({
    queryKey: ['siagie', 'validar', periodoId],
    queryFn: () => siagieApi.validar(periodoId).then(r => r.data.data),
    enabled: false  // solo al presionar "Validar"
  })

  const generar = useMutation({
    mutationFn: siagieApi.generar
  })

  return { preview: preview.data, validacion: validar.data, isLoading: preview.isLoading, refetchValidacion: validar.refetch, generar: generar.mutate, generando: generar.isPending }
}
```

---

## RECOMENDACIONES FINALES

1. **Nunca tocar los triggers del SQL con Prisma** — al usar `prisma migrate dev` en una base ya existente se podrían perder los triggers. Usar siempre `prisma db pull` + migraciones SQL manuales.

2. **Siempre setear `app.current_user_id`** antes de cualquier operación DML para que el trigger `fn_audit_trigger` funcione correctamente.

3. **Refresh de vistas materializadas** — programar un cron job (o hacerlo manualmente desde el backend) para refrescar `mv_libreta_alumno` y `formato_siagie` al cerrar cada bimestre.

4. **El SP `revisar_boleta` incluye toda la lógica** — no duplicar en el backend la sincronización de estados de pago ni la creación de notificaciones al rechazar. Dejar que el SP lo haga.

5. **Escala de calificaciones** — la conversión vigesimal→literal la hace el trigger. El backend solo valida que la escala esté configurada y cubre 0-20 antes de permitir el registro de notas.

6. **Código SIAGIE (`codigo_siagie`)** es opcional en la base de datos. Si está null, la columna del Acta 1 queda vacía. Advertir al Secretaria antes de exportar.

7. **Mora** — el cálculo del 5% acumulativo es solo visual/de reporte. No hay trigger que lo aplique automáticamente; el backend calcula y muestra la mora, pero el campo `monto` del pago original no cambia.

8. **El rol "Alumno/Padre"** que aparece en el login de las capturas → mapear al rol `Alumno` del SQL. No crear rol Padre.

9. **Supabase Storage** — crear los buckets como privados desde el dashboard de Supabase antes del primer despliegue. Las políticas de acceso al bucket se gestionan desde el Service Role Key en el backend.

10. **Para la libreta PDF** — usar `pdfkit` o `@react-pdf/renderer`. El diseño debe incluir: nombre IE, alumno, grado/sección/período, tabla de cursos>competencias>notas por bimestre, promedio, escala, sello digital.
