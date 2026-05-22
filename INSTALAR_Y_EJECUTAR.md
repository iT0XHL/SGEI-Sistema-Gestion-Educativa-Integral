# Guía de Instalación y Ejecución - SGEI

## Requisitos
- Node.js 18+
- PostgreSQL 14+
- pnpm (npm install -g pnpm)

## Backend Setup

```bash
cd backend

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales de BD

# Ejecutar migraciones Prisma
pnpm prisma migrate deploy

# Ejecutar seed (crear admin inicial)
pnpm db:seed

# IMPORTANTE: Ejecutar script para rellenar nombres faltantes
npx ts-node prisma/fix-names.ts

# Iniciar servidor
pnpm dev
```

El backend estará disponible en: `http://localhost:3001`

## Frontend Setup

```bash
cd frontend

# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev
```

El frontend estará disponible en: `http://localhost:5173`

## Credenciales Iniciales

**Admin:**
- Usuario: `director@sgei.edu.pe`
- Contraseña: `Admin1234`

## Portales Disponibles

1. **Portal Alumno**: http://localhost:5173/alumno
2. **Portal Docente**: http://localhost:5173/docente
3. **Portal Admin**: http://localhost:5173/admin
4. **Portal Secretaría**: http://localhost:5173/secretaria

## Fases Completadas

### Fase 3: Horarios ✅
- Acceso: Admin → Horarios
- CRUD completo con validaciones

### Fase 4: Asistencia Docente ✅
- Acceso: Secretaría → Asistencia Docente
- Registrar, editar, filtrar, eliminar

### Fase 5: Períodos y Bimestres ✅
- APIs listas en /api/periodos y /api/bimestres
- Páginas a crear en frontend

### Fase 6: Escala, Institución, Competencias 🔨
- Estructura base completada
- APIs a finalizar
- Páginas a crear

## Verificaciones

```bash
# Compilar TypeScript
pnpm build

# Verificar tipos
pnpm tsc --noEmit

# Linter (si aplica)
pnpm lint
```

## Troubleshooting

Si tienes error 400 al crear docentes:
1. Verifica los tipos en el schema (min/max de strings)
2. Revisa los logs del backend
3. Asegúrate de que los campos requeridos están presentes

Si docentes/alumnos muestran "null null null":
1. Ejecuta: `npx ts-node prisma/fix-names.ts`
2. Verifica que la BD tiene datos en esas columnas

Si el frontend no se conecta al backend:
1. Verifica que CORS está habilitado en backend
2. Revisa la URL base en `frontend/src/lib/api/client.ts`
3. Asegúrate de que ambos servidores están corriendo
