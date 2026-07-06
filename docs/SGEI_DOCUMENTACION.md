# SGEI — Sistema de Gestión Educativa Integral

Documentación general del proyecto para la IEP Virgen del Carmen - Las Viñas.

## 1. Contexto del proyecto

El SGEI centraliza la gestión académica, financiera y administrativa del colegio en una sola plataforma web, para los cuatro roles de la comunidad educativa: **Alumno** (y su familia), **Docente**, **Secretaría** y **Administrador**. Reemplaza procesos antes dispersos en hojas de cálculo y trámites presenciales: registro de notas, libretas de calificaciones, horarios, asistencia, pagos y comprobantes, simulacros de admisión, y la generación de actas oficiales para el sistema SIAGIE del Ministerio de Educación.

## 2. Módulos y funcionalidades principales

### Académico
- **Estructura académica**: niveles, grados, secciones, cursos, áreas académicas y competencias, configurables desde el panel de Administración.
- **Notas**: registro vigesimal (0–20) por competencia y bimestre. La conversión a nota literal (AD/A/B/C) la calcula un trigger de base de datos (`tg_set_nota_literal`) a partir de la escala configurable por período (`ConfigEscalaLiteral`), no el aplicativo.
- **Libretas**: snapshot inmutable por alumno y bimestre, con flujo de estados `BORRADOR → EN_REVISIÓN → APROBADA → PUBLICADA/OBSERVADA → ANULADA`. La vista y los documentos descargables del alumno muestran **solo la nota literal** (AD/A/B/C); los documentos de uso interno (docente/admin, exportación en lote, actas SIAGIE) conservan el valor numérico.
- **Materiales de clase**: archivos (PDF, imágenes, Word, Excel, PowerPoint, texto, comprimidos) subidos por el docente, visibles únicamente para los alumnos matriculados en la sección/curso correspondiente, con control de acceso validado en backend.
- **Simulacros de admisión**: banco de preguntas alimentado por los docentes por curso/grado cuando hay un simulacro activo; el Administrador cura y arma el examen final (documento inmutable).
- **Homónimos**: cuando dos alumnos comparten nombre y apellidos exactos, los listados administrativos añaden un sufijo visual con los últimos dígitos del DNI para evitar confusiones (no se altera el nombre real usado en actas oficiales).

### Horarios
- Bloques de horario por sección/docente, con descansos y configuración de jornada por nivel.
- Flujo de **publicación**: el horario en borrador no es visible para alumnos/docentes hasta que Administración lo publica explícitamente.
- Al publicar o cambiar un horario, se notifica a los alumnos de la sección y a los docentes asignados.

### Financiero
- Conceptos de pago, pagos por alumno y **vouchers/boletas de pago**: la familia sube su comprobante (imagen o PDF) a Supabase Storage; Secretaría lo revisa (aprobar/rechazar) desde un visor con zoom y descarga, sin exponer los datos bancarios de la transferencia en la previsualización.
- Recordatorio automático (`PAGO_POR_VENCER`) cuando un pago está próximo a vencer.

### SIAGIE
- Las actas de notas se generan **dinámicamente** a partir de una vista materializada (`audit_schema.formato_siagie`) que agrega notas por alumno/curso/bimestre del período académico activo — no hay cursos ni alumnos hardcodeados.
- El único contenido fijo es la estructura de columnas del formato oficial MINEDU (las 10 áreas curriculares del acta), ya que corresponde al formato del documento, no a datos institucionales.
- Institución, UGEL y año lectivo se inyectan dinámicamente desde el período académico activo — validado y corregido para que estadísticas, validaciones y exportación usen siempre el mismo período, nunca todos los períodos históricos mezclados.

### Notificaciones
Sistema de eventos con destinatarios resueltos siempre en backend (nunca por el cliente). Activos actualmente:
- **Alumno**: nota registrada/actualizada, libreta publicada, boleta revisada, pago por vencer, cambio de horario de su sección.
- **Docente**: alumno nuevo asignado a su sección/tutoría, cambio en su horario de dictado, simulacro activado, asistencia del día sin registrar.
- **Admin/Secretaría**: boleta subida para revisión, notas enviadas por un docente al cierre de bimestre.
Entrega en tiempo real vía Server-Sent Events (bus de notificaciones en proceso), con polling de respaldo si la conexión SSE se pierde.

## 3. Stack tecnológico

- **Backend**: Next.js (API routes) + TypeScript, Prisma ORM sobre PostgreSQL (alojado en Supabase).
- **Frontend**: React + TypeScript, React Router, TailwindCSS.
- **Almacenamiento de archivos**: Supabase Storage (materiales de clase, vouchers de pago), con URLs firmadas de vida corta.
- **Generación de documentos**: `pdfkit` (libretas en PDF), `exceljs` (actas SIAGIE), `docx` (libretas Word editables), `jszip` (exportación en lote).
- **Autenticación**: JWT propio (no Supabase Auth), con cookie `HttpOnly`, bcrypt para hashes de contraseña, y bloqueo temporal tras intentos fallidos.
- **Despliegue**: Vercel (frontend y backend), con un cron programado (`vercel.json`) para notificaciones basadas en tiempo.

## 4. Arquitectura

El backend sigue una arquitectura en capas:

```
app/api/**/route.ts      → controladores HTTP (auth, validación de entrada, respuesta)
modules/<dominio>/*.service.ts    → reglas de negocio
modules/<dominio>/*.repository.ts → acceso a datos (Prisma / SQL crudo)
prisma/schema.prisma               → modelos, separados en 4 schemas de Postgres:
  academic_schema  — estructura académica, notas, libretas, materiales, horarios
  auth_schema      — credenciales, perfiles, tokens de recuperación
  financial_schema — pagos, boletas
  audit_schema     — auditoría, vistas materializadas (SIAGIE, libretas)
```

Invariantes de negocio críticas se aplican con **triggers de base de datos**, no solo en la capa de aplicación — por ejemplo: un único período académico activo (`tg_un_periodo_activo`), cálculo automático de nota literal (`tg_set_nota_literal`), bloqueo de edición de notas cerradas (`tg_bloquear_nota_cerrada`), y transición automática de estado de pago al subir una boleta.

El frontend consume la API mediante un cliente HTTP centralizado (`lib/api/client.ts`) que siempre envía la cookie de sesión y normaliza errores (`ApiError`).

## 5. Seguridad

- **Contraseñas**: hash con bcrypt (costo configurable), nunca en texto plano.
- **Sesión**: JWT firmado en cookie `HttpOnly` + `Secure` en producción; lista de revocación en memoria para invalidar tokens emitidos antes de un cambio de contraseña.
- **Bloqueo de cuenta**: tras 5 intentos fallidos, bloqueo temporal de 30 minutos.
- **Recuperación de contraseña**: flujo self-service por email (usando el mismo correo de login de cualquier rol) con token de un solo uso, hash SHA-256 en base de datos, expiración de 30 minutos y límite de solicitudes para evitar abuso de envío de correos. El envío de email está detrás de una interfaz swappable (`EmailSender`), con una implementación por defecto sobre la API HTTP de Resend.
- **Autorización**: cada acción valida el rol y la relación real con la entidad (un docente solo accede a sus secciones asignadas; un alumno solo a su propia información), resuelto siempre en el backend.
- **Archivos**: subida validada por tipo MIME y tamaño máximo; acceso mediante URLs firmadas de corta duración, nunca URLs públicas permanentes.
- **Auditoría**: tabla `sesion_auditoria` registra acciones sensibles (login/logout, lectura de libretas, cambios administrativos) con actor, IP y user-agent.
- **Notificaciones**: destinatarios resueltos siempre en backend a partir de relaciones reales (nunca confiando en el cliente), evitando fuga de información entre alumnos/secciones.
