# SGEI — Backend

API del **Sistema de Gestión Educativa Integral**, construida con **Next.js 14 (Route Handlers)** sobre **Node.js 20** y **PostgreSQL 15** vía **Prisma ORM**.

> ⚠️ **Fuente de verdad:** `../SQL/sgei_ddl_v2.1_auditado (1).sql`.
> El backend NUNCA modifica el esquema de la base de datos. Los triggers,
> funciones, el stored procedure `revisar_boleta` y las políticas RLS ya
> existen en la DB y se respetan tal cual.

## Stack

- Next.js 14 · Route Handlers (`app/api/**`)
- Prisma ORM con `multiSchema` (`auth_schema`, `academic_schema`, `financial_schema`, `audit_schema`)
- Autenticación propia: JWT + Cookies HttpOnly + bcryptjs (sin Supabase Auth)
- Validación con Zod · RBAC (Admin / Secretaria / Docente / Alumno)
- PostgreSQL 15 en Docker (desarrollo) → Supabase (producción)

## Estructura

```
backend/
├── app/api/       Route Handlers (endpoints REST)
├── config/        env.ts — validación de entorno con Zod
├── errors/        Jerarquía de errores de aplicación
├── lib/           prisma (singleton), response (helpers estándar)
├── modules/       Lógica de negocio por dominio (service + repository)
├── prisma/        schema.prisma (refleja el DDL, NO migra)
├── repositories/  Acceso a datos compartido
├── schemas/       Esquemas Zod de validación
├── services/      Servicios transversales (storage, etc.)
├── storage/       Constantes de buckets de Supabase Storage
├── excel/         Builder ExcelJS (SIAGIE)
├── pdf/           Builder de libretas PDF
└── types/         Tipos TS (api, roles, ...)
```

## Puesta en marcha (desarrollo local con Docker DB)

1. **Levantar PostgreSQL 15** (Docker). Mientras no exista `docker-compose.yml`
   en el repo, un contenedor mínimo equivalente es:

   ```bash
   docker run --name sgei-db -e POSTGRES_USER=sgei -e POSTGRES_PASSWORD=sgei \
     -e POSTGRES_DB=sgei_db -p 5432:5432 -d postgres:15
   ```

2. **Cargar el DDL** (crea schemas, tablas, triggers, SP, RLS, vistas):

   ```bash
   docker exec -i sgei-db psql -U sgei -d sgei_db < "../SQL/sgei_ddl_v2.1_auditado (1).sql"
   ```

3. **Configurar entorno y dependencias:**

   ```bash
   cp .env.example .env      # ajustar si hace falta
   npm install               # ejecuta `prisma generate` (postinstall)
   ```

4. **Arrancar el servidor** (puerto 3001):

   ```bash
   npm run dev
   ```

## Probar la Fase 1

```bash
# Health check — debe responder { success: true, data: { status: "ok", database: "up" } }
curl http://localhost:3001/api/health

# Validar que el schema Prisma es consistente con la DB
npm run prisma:generate
npx prisma validate
```

## Estado por fases

- [x] **Fase 1 — Base:** estructura, `schema.prisma` (multiSchema, 29 tablas / 13 ENUMs), `lib/prisma`, respuestas estándar, errores, `config/env`, `GET /api/health`.
- [x] **Fase 2 — Auth y usuarios:** JWT en cookie HttpOnly, bcryptjs, bloqueo tras 5 intentos, `withAuth`/`withRole` (RBAC), auditoría LOGIN/LOGOUT, contexto de auditoría para triggers, CORS, `/api/auth/*`, `/api/usuarios/*`, seed Admin.
- [x] **Fase 3 — Estructura académica:** institución, períodos, bimestres, escala literal (validación cobertura 0–20), niveles, grados, secciones, cursos, competencias, asignaciones, horarios. Reglas respaldadas por triggers (`tg_un_periodo_activo`, `tg_cerrar_notas_bimestre`, `tg_validar_cruce_horario`).
- [x] **Fase 4 — Alumnos y docentes:** CRUD completo creando `credencial` + `perfil_usuario` + entidad de forma atómica (id pre-generado), control de cupo de sección, bloqueo manual de libreta, baja lógica (desactiva credencial), asignaciones y horario del docente.
- [ ] Fase 5 — Asistencias, materiales y actividades.
- [ ] Fase 6 — Notas y libretas (PDF).
- [ ] Fase 7 — Pagos y vouchers (SP `revisar_boleta`).
- [ ] Fase 8 — SIAGIE (ExcelJS), situación final, dashboards.
- [ ] Fase 9 — Testing, seguridad y despliegue en Railway.
