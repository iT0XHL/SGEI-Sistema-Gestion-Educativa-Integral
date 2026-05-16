# SGEI — Sistema de Gestión Educativa Integral

Full-stack **school management system** para instituciones educativas secundarias. Frontend Vite + React, Backend Next.js 14, Base de datos PostgreSQL 15, todo orquestado con Docker Compose.

> **Lenguaje:** Toda la UI, identificadores y términos de dominio están en **español**. Mantenerlo así.

## 🏗️ Stack Técnico

### Frontend
- **Vite 6** + **React 18** + **TypeScript**
- **React Router 7** — enrutamiento SPA
- **Tailwind CSS 4** — estilos utility-first
- **shadcn/ui** — componentes Radix-based
- Exportado desde Figma (Vite React + Tailwind plugins, ver `vite.config.ts`)

### Backend
- **Next.js 14** — Route Handlers (`app/api/**`)
- **Prisma ORM** — multiSchema (4 schemas: `auth_schema`, `academic_schema`, `financial_schema`, `audit_schema`)
- **Node.js 20** 
- **JWT + HttpOnly Cookies** — autenticación propia (sin Supabase Auth)
- **bcryptjs** — hashing de contraseñas (salt rounds: 12)
- **Zod** — validación
- **RBAC** — roles: Admin, Secretaria, Docente, Alumno

### Base de Datos
- **PostgreSQL 15**
- **29 tablas** + **14 ENUMs** + **triggers**, **funciones**, **stored procedures**, **RLS policies**
- Fuente de verdad: `SQL/sgei_ddl_v2.1_auditado (1).sql`
- **Auditoría integrada** vía `app.current_user_id` (trigger context)

## 📦 Estructura del Proyecto

```
.
├── docker-compose.yml       ⭐ Orquestación: PostgreSQL + Backend + Frontend
├── SQL/
│   ├── 00-setup.sql         Prepara auth schema y uid() function
│   └── sgei_ddl_v2.1_auditado (1).sql   DDL completo (tablas, triggers, RLS)
│
├── backend/
│   ├── Dockerfile           Node.js 20 + Prisma
│   ├── docker-entrypoint.sh Espera DB → prisma db pull → prisma generate → seed → dev
│   ├── package.json         Next.js, Prisma, JWT, bcryptjs, Zod
│   ├── tsconfig.json        Next.js + TypeScript
│   ├── prisma/
│   │   └── schema.prisma    Generado por "prisma db pull" (refleja DDL, NO migra)
│   ├── app/api/             Route Handlers REST
│   ├── config/              env.ts — validación de variables
│   ├── lib/                 Prisma singleton, response helpers
│   ├── modules/             Lógica de negocio (services + repositories)
│   ├── middleware/          Auth, RBAC, audit context
│   ├── schemas/             Zod validation schemas
│   └── types/               TypeScript types (api, roles, etc.)
│
├── frontend/
│   ├── Dockerfile           Node.js 22 + pnpm + Vite
│   ├── package.json         Vite, React, React Router, Tailwind, shadcn/ui
│   ├── vite.config.ts       Configuración Vite (Figma exports)
│   ├── index.html           ⭐ Punto de entrada HTML
│   ├── tsconfig.json        TypeScript
│   ├── src/
│   │   ├── main.tsx         React entry point
│   │   ├── app/
│   │   │   ├── App.tsx      RouterProvider
│   │   │   ├── routes.tsx   Rutas: /alumno, /docente, /admin, /secretaria
│   │   │   ├── pages/       Componentes de cada ruta
│   │   │   ├── components/  Componentes reutilizables + layout AppShell
│   │   │   └── data/        mockData.ts (datos mock, NO API)
│   │   └── assets/          Imágenes, iconos
│   └── pnpm-workspace.yaml  Monorepo config
│
└── .gitignore               Node modules, .env, build artifacts
```

## 🚀 Ejecución con Docker Compose

**Opción recomendada:** Todo con un solo comando.

### 1️⃣ Prerequisitos
- **Docker** + **Docker Compose** instalados
- Puerto **3000** (frontend), **3001** (backend), **5432** (DB) libres

### 2️⃣ Levantar todo
```bash
docker compose up --build
```

**Qué ocurre:**
1. PostgreSQL inicia y carga `00-setup.sql` + `sgei_ddl_v2.1_auditado (1).sql`
2. Backend espera a que DB esté healthy
3. Backend ejecuta `prisma db pull` para introspeccionar e inferir `schema.prisma` del DDL existente
4. Backend ejecuta `prisma generate` para crear Prisma Client
5. Backend ejecuta seed (crea usuario Admin: `director@sgei.edu.pe` / `Admin1234`)
6. Backend inicia en puerto **3001**
7. Frontend inicia en puerto **3000**

### 3️⃣ Acceder a la aplicación
- **Frontend:** http://localhost:3000
- **Backend (API):** http://localhost:3001/api
- **Health check:** `curl http://localhost:3001/api/health`

### 4️⃣ Ver logs
```bash
# Todo
docker compose logs -f

# Solo un servicio
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### 5️⃣ Detener
```bash
docker compose down
```

## 🛑 Desarrollo sin Docker (local)

Si prefieres ejecutar directamente en tu máquina:

### Base de datos
```bash
# Iniciar PostgreSQL en Docker (solo DB, no toda la stack)
docker run --name sgei-db \
  -e POSTGRES_USER=sgei \
  -e POSTGRES_PASSWORD=sgei \
  -e POSTGRES_DB=sgei_db \
  -p 5432:5432 \
  -d postgres:15

# Cargar DDL
docker exec -i sgei-db psql -U sgei -d sgei_db < SQL/00-setup.sql
docker exec -i sgei-db psql -U sgei -d sgei_db < "SQL/sgei_ddl_v2.1_auditado (1).sql"
```

### Backend
```bash
cd backend
cp .env.example .env  # Ajustar DATABASE_URL si es necesario
npm install
npm run dev  # Puerto 3001
```

### Frontend
```bash
cd frontend
pnpm install
pnpm dev  # Puerto 3000
```

## ⚙️ Variables de Entorno

### Backend (`backend/.env`)
```env
# PostgreSQL
DATABASE_URL="postgresql://sgei:sgei@db:5432/sgei_db"
DIRECT_URL="postgresql://sgei:sgei@db:5432/sgei_db"

# Node
NODE_ENV="development"

# JWT
JWT_SECRET="dev-secret-cambiar-en-produccion-minimo-64-caracteres-1234567890abcdef"
JWT_EXPIRES_IN="8h"
JWT_COOKIE_NAME="sgei_token"

# Seguridad
BCRYPT_SALT_ROUNDS="12"

# CORS
FRONTEND_ORIGIN="http://localhost:3000"

# Almacenamiento (Phase 5+)
MAX_FILE_SIZE_MB="5"
```

### Frontend (`.env` — NO requiere .env en Docker)
```env
# Auto-detecta backend en http://localhost:3001
```

## 🧪 Pruebas

### Health Check
```bash
curl http://localhost:3001/api/health
# Respuesta esperada:
# {"success": true, "data": {"status": "ok", "database": "up"}}
```

### Login (Fase 2)
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"director@sgei.edu.pe","password":"Admin1234"}' \
  -v
```

### Acceder a recursos protegidos
```bash
# La cookie se envía automáticamente si usas el mismo cliente
curl http://localhost:3001/api/usuarios \
  -H "Cookie: sgei_token=<token-del-login>"
```

## 📋 Comandos Útiles

### Backend
```bash
cd backend

# Dev
npm run dev                  # Inicio (puerto 3001)

# Build
npm run build               # Compilar para producción

# Prisma
npx prisma generate        # Generar cliente Prisma (ejecutado en docker-entrypoint)
npx prisma db pull         # Introspeccionar DB → schema.prisma
npx prisma validate        # Validar schema.prisma
npx prisma db seed         # Ejecutar seed.ts (crear datos iniciales)
npx prisma studio          # GUI interactiva de BD (localhost:5555)

# TypeScript
npm run type-check         # (No configurado, requiere agregar script)
```

### Frontend
```bash
cd frontend

# Dev
pnpm dev                    # Inicio (puerto 3000, con HMR)

# Build
pnpm build                  # Generar dist/

# Preview
pnpm preview               # Servir dist/ localmente
```

### Docker
```bash
# Rebuild todo
docker compose up --build

# Rebuild solo un servicio
docker compose up --build backend

# Ejecutar comando ad-hoc en un contenedor
docker compose exec backend npm run prisma:generate
docker compose exec db psql -U sgei -d sgei_db -c "SELECT version();"

# Limpiar volúmenes (BORRA datos de DB)
docker compose down -v
```

## 🔐 Autenticación

### Flujo
1. Usuario entra en `/` (Login)
2. POST `/api/auth/login` con email + password
3. Backend valida contra `credencial` → genera JWT
4. JWT se almacena en cookie HttpOnly (SameSite=Strict)
5. Rutas protegidas usan middleware `withAuth()` / `withRole()`

### Bloqueo de cuenta
- Tras **5 intentos fallidos** → cuenta bloqueada por **30 minutos**
- Trigger `tg_bloqueo_cuenta` gestiona las fechas

### Roles (RBAC)
- **Admin** — acceso total
- **Secretaria** — gestión de estudiantes, institucional
- **Docente** — notas, asistencia, materiales
- **Alumno** — consulta de notas, horarios, comunicados

## 🎨 Frontend — Estructura de Rutas

```
/                        Login (público)
/alumno/...             Portal Alumno
/docente/...            Portal Docente
/admin/...              Portal Admin
/secretaria/...         Portal Secretaria
```

**Nota:** El rol se deriva de la URL. No hay persistencia — la navegación es local (`useState`), todos los datos son mock.

## 🗄️ Base de Datos

### Esquemas Prisma (multiSchema)
- `auth_schema` — credenciales, usuarios, roles
- `academic_schema` — períodos, grados, cursos, notas
- `financial_schema` — pagos, vouchers, mora
- `audit_schema` — logs de auditoría

### Auditoría
- Todo cambio INSERT/UPDATE/DELETE se registra automáticamente
- Triggers capturan user_id vía `app.current_user_id` (setting de PostgreSQL)
- Middleware backend configura este setting antes de ejecutar queries

### Row-Level Security (RLS)
- Políticas garantizan que usuarios solo ven sus propios datos
- Ejemplo: Alumno solo ve sus notas, no las de otros

## 📊 Estado de Implementación

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1 | Base: estructura, schema.prisma, health check | ✅ |
| 2 | Auth: JWT, HttpOnly cookies, bcryptjs, RBAC, auditoría | ✅ |
| 3 | Académico: períodos, grados, cursos, competencias | ✅ |
| 4 | Alumnos/Docentes: CRUD, asignaciones, horarios | ✅ |
| 5 | Asistencias, materiales, actividades | ⏳ |
| 6 | Notas y libretas (PDF) | ⏳ |
| 7 | Pagos y vouchers (SP revisar_boleta) | ⏳ |
| 8 | SIAGIE (ExcelJS), dashboards, situación final | ⏳ |
| 9 | Testing, seguridad, despliegue Railway | ⏳ |

## 🚨 Importante

⚠️ **Nunca modificar el DDL desde Prisma (NO usar `prisma migrate`):**
- El DDL es el archivo `SQL/sgei_ddl_v2.1_auditado (1).sql`
- Prisma SOLO refleja la estructura (multiSchema) vía `prisma db pull`
- Cambios en tablas/triggers se hacen DIRECTAMENTE en PostgreSQL
- Luego se ejecuta `prisma db pull` para regenerar `schema.prisma`

## 📝 Archivos de Configuración

- `.gitignore` — Node modules, .env, artifacts de build
- `docker-compose.yml` — Orquestación de servicios
- `CLAUDE.md` — Instrucciones para Claude Code
- `.dockerignore` — Optimiza contexto de build

## 🆘 Troubleshooting

### Frontend muestra página en blanco
1. Verifica que `frontend/index.html` existe
2. Abre DevTools (F12) → Console → ¿hay errores rojo?
3. Revisa logs del frontend: `docker compose logs frontend`

### Backend no puede conectar a DB
1. Verifica que PostgreSQL está healthy: `docker compose ps`
2. Revisa logs: `docker compose logs db`
3. Intenta conectar manualmente: `docker compose exec db psql -U sgei -d sgei_db -c "SELECT 1;"`

### JWT/Auth fallando
1. Verifica que `JWT_SECRET` está configurada
2. Comprueba que la cookie se envía: DevTools → Network → Headers → Cookie
3. Revisa logs del backend: `docker compose logs backend`

### Puertos ya en uso
```bash
# Encontrar qué está usando puerto X
# En Windows PowerShell:
Get-NetTCPConnection -LocalPort 3000 | Get-Process

# En Linux/Mac:
lsof -i :3000
```

## 📚 Documentación Adicional

- `CLAUDE.md` — Guía para desarrolladores y Claude Code
- `backend/.env.example` — Variables de entorno del backend
- `SQL/sgei_ddl_v2.1_auditado (1).sql` — DDL completo con comentarios

## 🤝 Contribuir

1. Crea una rama: `git checkout -b feature/mi-feature`
2. Haz commit: `git commit -m "feat: descripción"`
3. Push y abre PR: `git push origin feature/mi-feature`

---

**Última actualización:** Mayo 2026  
**Equipo:** SGEI Development Team
