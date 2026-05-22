-- ============================================================
--  SGEI — Sistema de Gestión Educativa Integral
--  Script DDL v2.0 — PostgreSQL 15+
--  Refactorizado: 3FN | Sin Matrícula | Sin Apoderado
--  Nuevo flujo de pagos con SP y notificación automática
-- ============================================================
--  Orden de creación:
--    1.  Extensiones y esquemas
--    2.  Tipos ENUM
--    3.  Dominio 1 — Identidad y Acceso
--    4.  Dominio 2 — Académico y Administrativo
--    5.  Dominio 3 — Financiero
--    6.  Índices de rendimiento
--    7.  Funciones auxiliares (PL/pgSQL)
--    8.  Procedimiento almacenado: revisión de boleta
--    9.  Triggers de negocio y auditoría
--   10.  Políticas RLS
--   11.  Vistas y vistas materializadas
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- 1. EXTENSIONES Y ESQUEMAS
-- ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

CREATE SCHEMA IF NOT EXISTS auth_schema;
CREATE SCHEMA IF NOT EXISTS academic_schema;
CREATE SCHEMA IF NOT EXISTS financial_schema;
CREATE SCHEMA IF NOT EXISTS audit_schema;

COMMENT ON SCHEMA auth_schema      IS 'Identidad, credenciales y perfiles de usuario';
COMMENT ON SCHEMA academic_schema  IS 'Estructura académica, notas, asistencia y materiales';
COMMENT ON SCHEMA financial_schema IS 'Pagos, boletas y conceptos de cobro';
COMMENT ON SCHEMA audit_schema     IS 'Auditoría, historial de cambios e integraciones externas';


-- ──────────────────────────────────────────────────────────────
-- 2. TIPOS ENUM
-- ──────────────────────────────────────────────────────────────

CREATE TYPE auth_schema.rol_usuario AS ENUM (
    'Admin',
    'Secretaria',
    'Docente',
    'Alumno'
);

CREATE TYPE auth_schema.tipo_accion_auditoria AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'READ_SENSITIVE',
    'LOGIN',
    'LOGOUT'
);

CREATE TYPE academic_schema.estado_asistencia AS ENUM (
    'P',
    'F',
    'T',
    'J'
);

CREATE TYPE academic_schema.tipo_material AS ENUM (
    'PDF',
    'enlace',
    'video',
    'imagen',
    'otro'
);

CREATE TYPE academic_schema.tipo_actividad AS ENUM (
    'tarea',
    'practica',
    'evaluacion',
    'proyecto'
);

CREATE TYPE academic_schema.nota_literal AS ENUM (
    'AD',
    'A',
    'B',
    'C'
);

CREATE TYPE academic_schema.estado_entrega AS ENUM (
    'pendiente',
    'entregado',
    'calificado'
);

CREATE TYPE academic_schema.situacion_final AS ENUM (
    'Promovido',
    'Repitente',
    'Retirado',
    'Trasladado',
    'Fallecido'
);

CREATE TYPE academic_schema.tipo_evaluacion AS ENUM (
    'Final',
    'Recuperacion',
    'Ubicacion',
    'Estudio_Independiente'
);

-- Estados del registro de pago (entidad Pago)
CREATE TYPE financial_schema.estado_pago AS ENUM (
    'Pendiente',
    'En_Revision',
    'Pagado',
    'Rechazado'
);

-- Estados del comprobante adjunto (entidad BoletaPago)
CREATE TYPE financial_schema.estado_revision_boleta AS ENUM (
    'En_Revision',
    'Aprobada',
    'Rechazada'
);

CREATE TYPE financial_schema.tipo_notificacion AS ENUM (
    'sistema',
    'pago',
    'academico',
    'comunicado'
);

CREATE TYPE audit_schema.estado_integracion AS ENUM (
    'exitoso',
    'error',
    'pendiente',
    'reintento'
);

CREATE TYPE audit_schema.accion_integracion AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'SYNC'
);


-- ══════════════════════════════════════════════════════════════
-- 3. DOMINIO 1 — IDENTIDAD Y ACCESO
-- ══════════════════════════════════════════════════════════════

CREATE TABLE auth_schema.credencial (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_login     VARCHAR(50)  NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    nombres           VARCHAR(100),
    apellido_paterno  VARCHAR(60),
    apellido_materno  VARCHAR(60),
    activo            BOOLEAN      NOT NULL DEFAULT TRUE,
    intentos_fallidos SMALLINT     NOT NULL DEFAULT 0 CHECK (intentos_fallidos >= 0),
    bloqueado_hasta   TIMESTAMPTZ,
    ultimo_acceso     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  auth_schema.credencial IS 'Credenciales de autenticación. Separada del perfil para RLS.';
COMMENT ON COLUMN auth_schema.credencial.password_hash     IS 'bcrypt cost 12. Nunca texto plano.';
COMMENT ON COLUMN auth_schema.credencial.nombres           IS 'Nombres del usuario (usado para Admin/Secretaria).';
COMMENT ON COLUMN auth_schema.credencial.apellido_paterno  IS 'Apellido paterno del usuario (usado para Admin/Secretaria).';
COMMENT ON COLUMN auth_schema.credencial.apellido_materno  IS 'Apellido materno del usuario (usado para Admin/Secretaria).';
COMMENT ON COLUMN auth_schema.credencial.intentos_fallidos IS 'Se bloquea la cuenta al llegar a 5 intentos consecutivos.';
COMMENT ON COLUMN auth_schema.credencial.bloqueado_hasta   IS 'NULL = cuenta activa. Fecha futura = bloqueada temporalmente.';


CREATE TABLE auth_schema.perfil_usuario (
    id            UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    credencial_id UUID                    NOT NULL UNIQUE
                                          REFERENCES auth_schema.credencial(id)
                                          ON DELETE CASCADE,
    rol           auth_schema.rol_usuario NOT NULL,
    entidad_tipo  VARCHAR(30)             NOT NULL,
    entidad_id    UUID                    NOT NULL,
    created_at    TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  auth_schema.perfil_usuario IS 'Vincula credencial con rol y entidad. Núcleo de las políticas RLS.';
COMMENT ON COLUMN auth_schema.perfil_usuario.entidad_tipo IS 'Discriminador polimórfico: alumno, docente, admin, secretaria.';
COMMENT ON COLUMN auth_schema.perfil_usuario.entidad_id   IS 'ID de la entidad en su tabla respectiva.';


CREATE TABLE audit_schema.sesion_auditoria (
    id               UUID                              PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id       UUID                              NOT NULL
                                                       REFERENCES auth_schema.perfil_usuario(id)
                                                       ON DELETE RESTRICT,
    tipo_accion      auth_schema.tipo_accion_auditoria NOT NULL,
    modulo           VARCHAR(60)                       NOT NULL,
    entidad_afectada VARCHAR(80)                       NOT NULL,
    entidad_id       UUID,
    old_value        JSONB,
    new_value        JSONB,
    ip_origen        INET,
    user_agent       TEXT,
    fecha_hora       TIMESTAMPTZ                       NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_schema.sesion_auditoria IS 'Registro inmutable de acciones. Solo escritura por triggers.';


-- ══════════════════════════════════════════════════════════════
-- 4. DOMINIO 2 — ACADÉMICO Y ADMINISTRATIVO
-- ══════════════════════════════════════════════════════════════

CREATE TABLE academic_schema.institucion_educativa (
    id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre                VARCHAR(200) NOT NULL,
    codigo_modular        VARCHAR(20)  NOT NULL UNIQUE,
    codigo_ugel           VARCHAR(10)  NOT NULL,
    nombre_ugel           VARCHAR(150) NOT NULL,
    resolucion_creacion   VARCHAR(100),
    modalidad             VARCHAR(80)  NOT NULL DEFAULT 'Educación Básica Regular',
    gestion               VARCHAR(20)  NOT NULL CHECK (gestion IN ('Publica', 'Privada')),
    departamento          VARCHAR(80)  NOT NULL,
    provincia             VARCHAR(80)  NOT NULL,
    distrito              VARCHAR(80)  NOT NULL,
    centro_poblado        VARCHAR(100),
    direccion             VARCHAR(255),
    telefono              VARCHAR(15),
    email_institucional   VARCHAR(150),
    activo                BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE academic_schema.institucion_educativa IS 'Datos del colegio. Usados en la cabecera del acta SIAGIE y documentos oficiales.';


CREATE TABLE academic_schema.nivel (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(30) NOT NULL UNIQUE CHECK (nombre IN ('Primaria', 'Secundaria')),
    descripcion TEXT
);

COMMENT ON TABLE academic_schema.nivel IS 'Nivel educativo: Primaria o Secundaria.';


CREATE TABLE academic_schema.grado (
    id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nivel_id  UUID        NOT NULL REFERENCES academic_schema.nivel(id) ON DELETE RESTRICT,
    nombre    VARCHAR(30) NOT NULL,
    orden     SMALLINT    NOT NULL CHECK (orden > 0),
    UNIQUE (nivel_id, orden)
);

COMMENT ON TABLE academic_schema.grado IS '1°–6° Primaria / 1°–5° Secundaria.';


CREATE TABLE academic_schema.periodo_academico (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    año          SMALLINT    NOT NULL CHECK (año > 2000),
    nombre       VARCHAR(60) NOT NULL,
    fecha_inicio DATE        NOT NULL,
    fecha_fin    DATE        NOT NULL CHECK (fecha_fin > fecha_inicio),
    activo       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (año)
);

COMMENT ON TABLE  academic_schema.periodo_academico IS 'Año lectivo centralizado. Un solo período activo a la vez.';
COMMENT ON COLUMN academic_schema.periodo_academico.activo IS 'Controlado por trigger fn_un_periodo_activo.';


CREATE TABLE academic_schema.docente (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil_usuario_id   UUID         NOT NULL UNIQUE
                                     REFERENCES auth_schema.perfil_usuario(id)
                                     ON DELETE RESTRICT,
    dni                 CHAR(8)      NOT NULL UNIQUE CHECK (dni ~ '^[0-9]{8}$'),
    nombres             VARCHAR(100) NOT NULL,
    apellido_paterno    VARCHAR(60)  NOT NULL,
    apellido_materno    VARCHAR(60)  NOT NULL,
    fecha_nacimiento    DATE,
    sexo                CHAR(1)      CHECK (sexo IN ('M', 'F')),
    especialidad        VARCHAR(150) NOT NULL,
    titulo_profesional  VARCHAR(200),
    telefono            VARCHAR(15)  NOT NULL,
    email_institucional VARCHAR(150) UNIQUE,
    foto_url            TEXT,
    activo              BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_ingreso       DATE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE academic_schema.docente IS 'Personal docente. La asistencia la registra el Admin.';


CREATE TABLE academic_schema.seccion (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    grado_id         UUID        NOT NULL REFERENCES academic_schema.grado(id) ON DELETE RESTRICT,
    periodo_id       UUID        NOT NULL REFERENCES academic_schema.periodo_academico(id) ON DELETE RESTRICT,
    nombre           VARCHAR(5)  NOT NULL,
    turno            VARCHAR(20) NOT NULL DEFAULT 'Mañana' CHECK (turno IN ('Mañana', 'Tarde', 'Noche')),
    cupo_maximo      SMALLINT    NOT NULL CHECK (cupo_maximo > 0 AND cupo_maximo <= 45),
    docente_tutor_id UUID        REFERENCES academic_schema.docente(id) ON DELETE SET NULL,
    aula             VARCHAR(20),
    UNIQUE (grado_id, periodo_id, nombre)
);

COMMENT ON TABLE  academic_schema.seccion IS 'Sección dentro de un grado para un período académico.';
COMMENT ON COLUMN academic_schema.seccion.turno IS 'Turno de la sección. Requerido por el acta SIAGIE.';


-- ──────────────────────────────────────────────────────────────
-- Alumno — 3FN aplicada:
--   · Eliminados todos los atributos de apoderado.
--   · Eliminada FK a matrícula (entidad suprimida).
--   · seccion_id y periodo_id determinan la ubicación académica
--     directamente; no existe dependencia transitiva porque el
--     periodo_id no puede derivarse de seccion_id solo (una
--     sección ya lleva periodo, pero el alumno necesita el
--     vínculo explícito para consultas SIAGIE independientes).
-- ──────────────────────────────────────────────────────────────
CREATE TABLE academic_schema.alumno (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil_usuario_id   UUID         NOT NULL UNIQUE
                                     REFERENCES auth_schema.perfil_usuario(id)
                                     ON DELETE RESTRICT,
    seccion_id          UUID         NOT NULL REFERENCES academic_schema.seccion(id) ON DELETE RESTRICT,
    periodo_id          UUID         NOT NULL REFERENCES academic_schema.periodo_academico(id) ON DELETE RESTRICT,
    dni                 CHAR(8)      NOT NULL UNIQUE CHECK (dni ~ '^[0-9]{8}$'),
    codigo_siagie       VARCHAR(20)  UNIQUE,
    nombres             VARCHAR(100) NOT NULL,
    apellido_paterno    VARCHAR(60)  NOT NULL,
    apellido_materno    VARCHAR(60)  NOT NULL,
    fecha_nacimiento    DATE         NOT NULL,
    sexo                CHAR(1)      NOT NULL CHECK (sexo IN ('M', 'F')),
    foto_url            TEXT,
    direccion           VARCHAR(255),
    distrito            VARCHAR(100),
    telefono_emergencia VARCHAR(15),
    grupo_sanguineo     VARCHAR(5)   CHECK (grupo_sanguineo IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    condicion_especial  TEXT,
    bloqueo_manual      BOOLEAN      NOT NULL DEFAULT FALSE,
    activo              BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (dni, periodo_id)
);

COMMENT ON TABLE  academic_schema.alumno IS 'Alumno inscrito en una sección. Sin datos de apoderado ni entidad Matrícula.';
COMMENT ON COLUMN academic_schema.alumno.codigo_siagie  IS 'Código único asignado por MINEDU/SIAGIE. Puede ser NULL hasta su asignación.';
COMMENT ON COLUMN academic_schema.alumno.bloqueo_manual IS 'TRUE = Admin bloquea descarga de libreta independientemente de deuda.';


CREATE TABLE academic_schema.asistencia_docente (
    id             UUID                              PRIMARY KEY DEFAULT gen_random_uuid(),
    docente_id     UUID                              NOT NULL REFERENCES academic_schema.docente(id) ON DELETE RESTRICT,
    registrado_por UUID                              NOT NULL REFERENCES auth_schema.perfil_usuario(id) ON DELETE RESTRICT,
    fecha          DATE                              NOT NULL,
    estado         academic_schema.estado_asistencia NOT NULL,
    justificacion  TEXT,
    hora_registro  TIMESTAMPTZ                       NOT NULL DEFAULT NOW(),
    UNIQUE (docente_id, fecha)
);

COMMENT ON TABLE  academic_schema.asistencia_docente IS 'Asistencia del personal docente. Solo el rol Admin puede registrar (validado por RLS).';
COMMENT ON COLUMN academic_schema.asistencia_docente.registrado_por IS 'Siempre perfil con rol Admin. Enforced por RLS.';


CREATE TABLE academic_schema.bimestre (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    periodo_id   UUID        NOT NULL REFERENCES academic_schema.periodo_academico(id) ON DELETE RESTRICT,
    numero       SMALLINT    NOT NULL CHECK (numero IN (1, 2, 3, 4)),
    nombre       VARCHAR(40) NOT NULL,
    fecha_inicio DATE        NOT NULL,
    fecha_fin    DATE        NOT NULL CHECK (fecha_fin > fecha_inicio),
    cerrado      BOOLEAN     NOT NULL DEFAULT FALSE,
    UNIQUE (periodo_id, numero)
);

COMMENT ON TABLE  academic_schema.bimestre IS 'Períodos de evaluación. El cierre bloquea INSERT/UPDATE en Nota.';
COMMENT ON COLUMN academic_schema.bimestre.cerrado IS 'TRUE bloquea registro de notas. Solo Admin puede revertir.';


CREATE TABLE academic_schema.curso (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nivel_id        UUID         NOT NULL REFERENCES academic_schema.nivel(id) ON DELETE RESTRICT,
    nombre          VARCHAR(120) NOT NULL,
    codigo_cneb     VARCHAR(20),
    descripcion     TEXT,
    horas_semanales SMALLINT     CHECK (horas_semanales > 0),
    UNIQUE (nivel_id, nombre)
);

COMMENT ON TABLE academic_schema.curso IS 'Área curricular según CNEB. Asociada a un nivel educativo.';


CREATE TABLE academic_schema.competencia (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id    UUID         NOT NULL REFERENCES academic_schema.curso(id) ON DELETE RESTRICT,
    nombre      VARCHAR(200) NOT NULL,
    descripcion TEXT,
    tipo        VARCHAR(20)  NOT NULL CHECK (tipo IN ('regular', 'transversal')),
    orden       SMALLINT     CHECK (orden > 0)
);

COMMENT ON TABLE academic_schema.competencia IS 'Unidad mínima de evaluación CNEB.';


CREATE TABLE academic_schema.asignacion_docente (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    docente_id  UUID        NOT NULL REFERENCES academic_schema.docente(id) ON DELETE RESTRICT,
    curso_id    UUID        NOT NULL REFERENCES academic_schema.curso(id) ON DELETE RESTRICT,
    seccion_id  UUID        NOT NULL REFERENCES academic_schema.seccion(id) ON DELETE RESTRICT,
    periodo_id  UUID        NOT NULL REFERENCES academic_schema.periodo_academico(id) ON DELETE RESTRICT,
    activo      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (docente_id, seccion_id, curso_id, periodo_id)
);

COMMENT ON TABLE academic_schema.asignacion_docente IS 'Relación docente–curso–sección por período. Base del control de acceso a notas.';


CREATE TABLE academic_schema.horario (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    asignacion_id UUID        NOT NULL REFERENCES academic_schema.asignacion_docente(id) ON DELETE CASCADE,
    dia_semana    SMALLINT    NOT NULL CHECK (dia_semana BETWEEN 1 AND 6),
    hora_inicio   TIME        NOT NULL,
    hora_fin      TIME        NOT NULL CHECK (hora_fin > hora_inicio),
    aula          VARCHAR(20)
);

COMMENT ON TABLE  academic_schema.horario IS 'Bloque horario de una asignación. Cruces validados por trigger.';
COMMENT ON COLUMN academic_schema.horario.dia_semana IS '1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado.';


CREATE TABLE academic_schema.config_escala_literal (
    id             UUID                         PRIMARY KEY DEFAULT gen_random_uuid(),
    periodo_id     UUID                         NOT NULL REFERENCES academic_schema.periodo_academico(id) ON DELETE RESTRICT,
    escala         academic_schema.nota_literal NOT NULL,
    rango_inferior NUMERIC(4,2)                 NOT NULL CHECK (rango_inferior >= 0),
    rango_superior NUMERIC(4,2)                 NOT NULL CHECK (rango_superior <= 20),
    CHECK (rango_superior > rango_inferior),
    UNIQUE (periodo_id, escala)
);

COMMENT ON TABLE academic_schema.config_escala_literal IS 'Rangos configurables de conversión vigesimal → AD/A/B/C por período.';


CREATE TABLE academic_schema.nota (
    id              UUID                            PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id       UUID                            NOT NULL REFERENCES academic_schema.alumno(id) ON DELETE RESTRICT,
    competencia_id  UUID                            NOT NULL REFERENCES academic_schema.competencia(id) ON DELETE RESTRICT,
    bimestre_id     UUID                            NOT NULL REFERENCES academic_schema.bimestre(id) ON DELETE RESTRICT,
    docente_id      UUID                            NOT NULL REFERENCES academic_schema.docente(id) ON DELETE RESTRICT,
    nota_vigesimal  NUMERIC(4,2)                    NOT NULL CHECK (nota_vigesimal >= 0 AND nota_vigesimal <= 20),
    nota_literal    academic_schema.nota_literal    NOT NULL,
    tipo_evaluacion academic_schema.tipo_evaluacion NOT NULL DEFAULT 'Final',
    cerrada         BOOLEAN                         NOT NULL DEFAULT FALSE,
    observacion     TEXT,
    fecha_registro  TIMESTAMPTZ                     NOT NULL DEFAULT NOW(),
    UNIQUE (alumno_id, competencia_id, bimestre_id)
);

COMMENT ON TABLE  academic_schema.nota IS 'Calificación oficial por competencia y bimestre. Inmutable al cerrar el bimestre.';
COMMENT ON COLUMN academic_schema.nota.nota_literal    IS 'Calculada automáticamente por trigger tg_set_nota_literal.';
COMMENT ON COLUMN academic_schema.nota.tipo_evaluacion IS 'Requerido por SIAGIE: Final, Recuperación, Ubicación o Estudio Independiente.';
COMMENT ON COLUMN academic_schema.nota.cerrada         IS 'TRUE bloquea UPDATE. Solo Admin puede desbloquear mediante HistorialNota.';


CREATE TABLE academic_schema.situacion_final_alumno (
    id                        UUID                            PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id                 UUID                            NOT NULL REFERENCES academic_schema.alumno(id) ON DELETE RESTRICT,
    periodo_id                UUID                            NOT NULL REFERENCES academic_schema.periodo_academico(id) ON DELETE RESTRICT,
    situacion_final           academic_schema.situacion_final NOT NULL,
    numero_areas_desaprobadas SMALLINT                        NOT NULL DEFAULT 0 CHECK (numero_areas_desaprobadas >= 0),
    comportamiento            VARCHAR(10),
    motivo_retiro             TEXT,
    observaciones             TEXT,
    registrado_por            UUID                            NOT NULL REFERENCES auth_schema.perfil_usuario(id) ON DELETE RESTRICT,
    fecha_registro            TIMESTAMPTZ                     NOT NULL DEFAULT NOW(),
    UNIQUE (alumno_id, periodo_id)
);

COMMENT ON TABLE  academic_schema.situacion_final_alumno IS 'Cierre académico anual por alumno. Alimenta la columna Situación Final del acta SIAGIE.';
COMMENT ON COLUMN academic_schema.situacion_final_alumno.motivo_retiro IS 'Requerido cuando situacion_final = Retirado o Trasladado.';
COMMENT ON COLUMN academic_schema.situacion_final_alumno.comportamiento IS 'Nota de conducta. Puede ser literal (AD/A/B/C) o numérica según nivel.';


CREATE TABLE audit_schema.historial_nota (
    id               UUID                         PRIMARY KEY DEFAULT gen_random_uuid(),
    nota_id          UUID                         NOT NULL REFERENCES academic_schema.nota(id) ON DELETE RESTRICT,
    valor_anterior   NUMERIC(4,2)                 NOT NULL,
    literal_anterior academic_schema.nota_literal NOT NULL,
    valor_nuevo      NUMERIC(4,2)                 NOT NULL,
    literal_nuevo    academic_schema.nota_literal NOT NULL,
    modificado_por   UUID                         NOT NULL REFERENCES auth_schema.perfil_usuario(id) ON DELETE RESTRICT,
    motivo           TEXT                         NOT NULL,
    fecha            TIMESTAMPTZ                  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_schema.historial_nota IS 'Trazabilidad de cambios en notas cerradas. Obligatorio para auditoría MINEDU.';


CREATE TABLE academic_schema.asistencia (
    id             UUID                              PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id      UUID                              NOT NULL REFERENCES academic_schema.alumno(id) ON DELETE RESTRICT,
    seccion_id     UUID                              NOT NULL REFERENCES academic_schema.seccion(id) ON DELETE RESTRICT,
    fecha          DATE                              NOT NULL,
    estado         academic_schema.estado_asistencia NOT NULL,
    justificacion  TEXT,
    registrado_por UUID                              NOT NULL REFERENCES academic_schema.docente(id) ON DELETE RESTRICT,
    hora_registro  TIMESTAMPTZ                       NOT NULL DEFAULT NOW(),
    UNIQUE (alumno_id, seccion_id, fecha)
);

COMMENT ON TABLE academic_schema.asistencia IS 'Registro diario de asistencia de alumnos. Un registro por alumno por día.';


CREATE TABLE academic_schema.material (
    id                UUID                          PRIMARY KEY DEFAULT gen_random_uuid(),
    docente_id        UUID                          NOT NULL REFERENCES academic_schema.docente(id) ON DELETE RESTRICT,
    curso_id          UUID                          NOT NULL REFERENCES academic_schema.curso(id) ON DELETE RESTRICT,
    seccion_id        UUID                          NOT NULL REFERENCES academic_schema.seccion(id) ON DELETE RESTRICT,
    titulo            VARCHAR(200)                  NOT NULL,
    descripcion       TEXT,
    tipo              academic_schema.tipo_material NOT NULL,
    url               TEXT                          NOT NULL,
    fecha_publicacion TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
    visible           BOOLEAN                       NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE academic_schema.material IS 'Recurso académico publicado por el docente a una sección.';


CREATE TABLE academic_schema.actividad (
    id               UUID                           PRIMARY KEY DEFAULT gen_random_uuid(),
    docente_id       UUID                           NOT NULL REFERENCES academic_schema.docente(id) ON DELETE RESTRICT,
    curso_id         UUID                           NOT NULL REFERENCES academic_schema.curso(id) ON DELETE RESTRICT,
    seccion_id       UUID                           NOT NULL REFERENCES academic_schema.seccion(id) ON DELETE RESTRICT,
    titulo           VARCHAR(200)                   NOT NULL,
    descripcion      TEXT,
    tipo             academic_schema.tipo_actividad,
    fecha_asignacion TIMESTAMPTZ                    NOT NULL DEFAULT NOW(),
    fecha_limite     TIMESTAMPTZ                    NOT NULL,
    puntaje_maximo   NUMERIC(5,2)                   NOT NULL CHECK (puntaje_maximo > 0),
    url_adjunto      TEXT,
    CHECK (fecha_limite > fecha_asignacion)
);

COMMENT ON TABLE academic_schema.actividad IS 'Tarea o evaluación asignada a los alumnos de una sección.';


CREATE TABLE academic_schema.entrega_actividad (
    id                  UUID                           PRIMARY KEY DEFAULT gen_random_uuid(),
    actividad_id        UUID                           NOT NULL REFERENCES academic_schema.actividad(id) ON DELETE RESTRICT,
    alumno_id           UUID                           NOT NULL REFERENCES academic_schema.alumno(id) ON DELETE RESTRICT,
    estado              academic_schema.estado_entrega NOT NULL DEFAULT 'pendiente',
    url_archivo         TEXT,
    comentario_alumno   TEXT,
    fecha_entrega       TIMESTAMPTZ                    NOT NULL DEFAULT NOW(),
    nota                NUMERIC(5,2)                   CHECK (nota >= 0),
    observacion_docente TEXT,
    fecha_calificacion  TIMESTAMPTZ,
    UNIQUE (actividad_id, alumno_id)
);

COMMENT ON TABLE  academic_schema.entrega_actividad IS 'Entrega de un alumno con estado explícito: pendiente | entregado | calificado.';
COMMENT ON COLUMN academic_schema.entrega_actividad.estado IS 'Estado explícito. No derivado de campos calculados.';


-- ══════════════════════════════════════════════════════════════
-- 5. DOMINIO 3 — FINANCIERO
-- ══════════════════════════════════════════════════════════════

CREATE TABLE financial_schema.concepto_pago (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(80)   NOT NULL,
    descripcion TEXT,
    monto_base  NUMERIC(10,2) NOT NULL CHECK (monto_base > 0),
    activo      BOOLEAN       NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE financial_schema.concepto_pago IS 'Catálogo de tipos de cobro: Pensión, Talleres, etc.';


-- ──────────────────────────────────────────────────────────────
-- Pago — registro de obligación financiera por alumno.
-- Estado inicial: 'Pendiente'. Sincronizado por SP revisar_boleta.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE financial_schema.pago (
    id                UUID                         PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id         UUID                         NOT NULL REFERENCES academic_schema.alumno(id) ON DELETE RESTRICT,
    concepto_id       UUID                         NOT NULL REFERENCES financial_schema.concepto_pago(id) ON DELETE RESTRICT,
    periodo_id        UUID                         NOT NULL REFERENCES academic_schema.periodo_academico(id) ON DELETE RESTRICT,
    mes               SMALLINT                     CHECK (mes BETWEEN 1 AND 12),
    monto             NUMERIC(10,2)                NOT NULL CHECK (monto > 0),
    estado            financial_schema.estado_pago NOT NULL DEFAULT 'Pendiente',
    fecha_vencimiento DATE                         NOT NULL,
    fecha_pago        DATE,
    generado_por      UUID                         NOT NULL REFERENCES auth_schema.perfil_usuario(id) ON DELETE RESTRICT,
    created_at        TIMESTAMPTZ                  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  financial_schema.pago IS 'Cobro a un alumno. Estado sincronizado por el SP financial_schema.revisar_boleta.';
COMMENT ON COLUMN financial_schema.pago.estado IS 'Flujo: Pendiente → En_Revision → Pagado | Rechazado.';


-- ──────────────────────────────────────────────────────────────
-- BoletaPago — comprobante adjuntado por el Alumno.
-- Estado inicial: 'En_Revision' (no editable por el alumno).
-- Solo Secretaria/Admin pueden cambiar el estado mediante el SP.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE financial_schema.boleta_pago (
    id                    UUID                                    PRIMARY KEY DEFAULT gen_random_uuid(),
    pago_id               UUID                                    NOT NULL UNIQUE
                                                                  REFERENCES financial_schema.pago(id)
                                                                  ON DELETE CASCADE,
    url_archivo           TEXT                                    NOT NULL,
    nombre_archivo        VARCHAR(200),
    banco                 VARCHAR(80),
    numero_operacion      VARCHAR(50),
    estado_revision       financial_schema.estado_revision_boleta NOT NULL DEFAULT 'En_Revision',
    -- Obligatorio cuando estado_revision = 'Rechazada'; enforced en SP revisar_boleta.
    observacion_rechazo   TEXT,
    revisado_por          UUID                                    REFERENCES auth_schema.perfil_usuario(id) ON DELETE SET NULL,
    fecha_revision        TIMESTAMPTZ,
    fecha_subida          TIMESTAMPTZ                             NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  financial_schema.boleta_pago IS 'Comprobante adjunto por el Alumno. Estado inicial En_Revision. Revisado exclusivamente por Secretaria.';
COMMENT ON COLUMN financial_schema.boleta_pago.estado_revision     IS 'En_Revision → Aprobada | Rechazada. Transición gestionada por SP revisar_boleta.';
COMMENT ON COLUMN financial_schema.boleta_pago.observacion_rechazo IS 'Obligatoria cuando estado_revision = Rechazada. Enforced por SP revisar_boleta.';


CREATE TABLE financial_schema.notificacion (
    id                 UUID                               PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_destino_id UUID                               NOT NULL REFERENCES auth_schema.perfil_usuario(id) ON DELETE CASCADE,
    tipo               financial_schema.tipo_notificacion NOT NULL,
    titulo             VARCHAR(150)                       NOT NULL,
    cuerpo             TEXT                               NOT NULL,
    url_accion         TEXT,
    leida              BOOLEAN                            NOT NULL DEFAULT FALSE,
    fecha_lectura      TIMESTAMPTZ,
    created_at         TIMESTAMPTZ                        NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE financial_schema.notificacion IS 'Mensajes internos del sistema para todos los roles.';


CREATE TABLE audit_schema.integracion_siagie (
    id              UUID                            PRIMARY KEY DEFAULT gen_random_uuid(),
    entidad         VARCHAR(60)                     NOT NULL,
    entidad_id      UUID                            NOT NULL,
    accion          audit_schema.accion_integracion NOT NULL,
    payload_enviado JSONB                           NOT NULL,
    respuesta       JSONB,
    estado          audit_schema.estado_integracion NOT NULL DEFAULT 'pendiente',
    codigo_error    VARCHAR(20),
    fecha           TIMESTAMPTZ                     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_schema.integracion_siagie IS 'Log de sincronización con SIAGIE (MINEDU).';


-- ══════════════════════════════════════════════════════════════
-- 6. ÍNDICES DE RENDIMIENTO
-- ══════════════════════════════════════════════════════════════

CREATE INDEX idx_credencial_login       ON auth_schema.credencial(usuario_login);
CREATE INDEX idx_perfil_rol             ON auth_schema.perfil_usuario(rol);
CREATE INDEX idx_perfil_entidad         ON auth_schema.perfil_usuario(entidad_tipo, entidad_id);

CREATE INDEX idx_alumno_seccion_periodo ON academic_schema.alumno(seccion_id, periodo_id);
CREATE INDEX idx_alumno_dni             ON academic_schema.alumno(dni);
CREATE INDEX idx_alumno_codigo_siagie   ON academic_schema.alumno(codigo_siagie);
CREATE INDEX idx_alumno_activo          ON academic_schema.alumno(activo) WHERE activo = TRUE;

CREATE INDEX idx_nota_alumno_bimestre   ON academic_schema.nota(alumno_id, bimestre_id, competencia_id);
CREATE INDEX idx_nota_docente           ON academic_schema.nota(docente_id);
CREATE INDEX idx_nota_cerrada           ON academic_schema.nota(cerrada) WHERE cerrada = FALSE;
CREATE INDEX idx_nota_tipo_evaluacion   ON academic_schema.nota(tipo_evaluacion);

CREATE INDEX idx_asistencia_fecha       ON academic_schema.asistencia(seccion_id, fecha);
CREATE INDEX idx_asistencia_alumno      ON academic_schema.asistencia(alumno_id, fecha);

CREATE INDEX idx_asistencia_docente     ON academic_schema.asistencia_docente(docente_id, fecha);

CREATE INDEX idx_horario_asignacion     ON academic_schema.horario(asignacion_id, dia_semana, hora_inicio);

CREATE INDEX idx_actividad_seccion      ON academic_schema.actividad(seccion_id, curso_id);
CREATE INDEX idx_entrega_alumno         ON academic_schema.entrega_actividad(alumno_id);
CREATE INDEX idx_entrega_actividad      ON academic_schema.entrega_actividad(actividad_id);
CREATE INDEX idx_entrega_estado         ON academic_schema.entrega_actividad(estado);

CREATE INDEX idx_pago_estado_alumno     ON financial_schema.pago(alumno_id, estado, mes);
CREATE INDEX idx_pago_vencimiento       ON financial_schema.pago(fecha_vencimiento, estado);
CREATE INDEX idx_boleta_estado          ON financial_schema.boleta_pago(estado_revision);
CREATE INDEX idx_notificacion_destino   ON financial_schema.notificacion(usuario_destino_id, leida);

CREATE INDEX idx_auditoria_usuario      ON audit_schema.sesion_auditoria(usuario_id, fecha_hora DESC);
CREATE INDEX idx_auditoria_entidad      ON audit_schema.sesion_auditoria(entidad_afectada, entidad_id);
CREATE INDEX idx_historial_nota         ON audit_schema.historial_nota(nota_id, fecha DESC);
CREATE INDEX idx_integracion_estado     ON audit_schema.integracion_siagie(estado, fecha DESC);

CREATE INDEX idx_bimestre_periodo       ON academic_schema.bimestre(periodo_id, numero);
CREATE INDEX idx_bimestre_cerrado       ON academic_schema.bimestre(cerrado) WHERE cerrado = FALSE;

CREATE INDEX idx_situacion_final        ON academic_schema.situacion_final_alumno(alumno_id, periodo_id);


-- ══════════════════════════════════════════════════════════════
-- 7. FUNCIONES AUXILIARES (PL/pgSQL)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION academic_schema.fn_vigesimal_to_literal(
    p_nota    NUMERIC,
    p_periodo UUID
)
RETURNS academic_schema.nota_literal
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_literal academic_schema.nota_literal;
BEGIN
    SELECT escala
    INTO   v_literal
    FROM   academic_schema.config_escala_literal
    WHERE  periodo_id = p_periodo
      AND  p_nota BETWEEN rango_inferior AND rango_superior
    LIMIT 1;

    IF v_literal IS NULL THEN
        RAISE EXCEPTION 'No se encontró escala literal para nota % en período %', p_nota, p_periodo;
    END IF;

    RETURN v_literal;
END;
$$;

COMMENT ON FUNCTION academic_schema.fn_vigesimal_to_literal IS 'Convierte nota vigesimal a AD/A/B/C según ConfigEscalaLiteral del período.';


CREATE OR REPLACE FUNCTION financial_schema.fn_tiene_deuda_pendiente(p_alumno_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM   financial_schema.pago
        WHERE  alumno_id = p_alumno_id
          AND  estado    IN ('Pendiente', 'Rechazado')
    );
$$;

COMMENT ON FUNCTION financial_schema.fn_tiene_deuda_pendiente IS 'TRUE si hay cualquier pago sin resolver. Bloquea descarga de libreta.';


CREATE OR REPLACE FUNCTION financial_schema.fn_bloquea_libreta(p_alumno_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
    SELECT
        a.bloqueo_manual OR financial_schema.fn_tiene_deuda_pendiente(p_alumno_id)
    FROM academic_schema.alumno a
    WHERE a.id = p_alumno_id;
$$;

COMMENT ON FUNCTION financial_schema.fn_bloquea_libreta IS 'TRUE si bloqueo_manual=TRUE O si existe deuda sin resolver. Usado en mv_libreta_alumno.';


-- ══════════════════════════════════════════════════════════════
-- 8. PROCEDIMIENTO ALMACENADO: REVISIÓN DE BOLETA
--
-- Opción técnica elegida: PROCEDURE (no función trigger).
-- Justificación: la revisión implica múltiples operaciones DML
-- atómicas (UPDATE boleta + UPDATE pago + INSERT notificacion)
-- que deben ejecutarse en una sola transacción controlada por
-- la capa de aplicación. Un PROCEDURE permite llamar COMMIT/
-- ROLLBACK explícitos si fuera necesario y es más expresivo
-- para lógica de negocio que una función de trigger, la cual
-- quedaría acoplada a un evento de tabla y no podría recibir
-- el id del revisor como parámetro validado.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE PROCEDURE financial_schema.revisar_boleta(
    p_boleta_id          UUID,
    p_revisor_id         UUID,
    p_nuevo_estado       financial_schema.estado_revision_boleta,
    p_observacion_rechazo TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_rol_revisor        auth_schema.rol_usuario;
    v_pago_id            UUID;
    v_alumno_perfil_id   UUID;
    v_estado_actual      financial_schema.estado_revision_boleta;
    v_nuevo_estado_pago  financial_schema.estado_pago;
    v_fecha_pago         DATE;
    v_titulo_notif       VARCHAR(150);
    v_cuerpo_notif       TEXT;
BEGIN
    -- 1. Verificar que el revisor tiene rol Secretaria o Admin
    SELECT rol INTO v_rol_revisor
    FROM   auth_schema.perfil_usuario
    WHERE  id = p_revisor_id;

    IF v_rol_revisor NOT IN ('Secretaria', 'Admin') THEN
        RAISE EXCEPTION 'Acceso denegado: solo Secretaria o Admin pueden revisar boletas.';
    END IF;

    -- 2. Obtener datos actuales de la boleta y validar existencia
    SELECT bp.estado_revision, bp.pago_id
    INTO   v_estado_actual, v_pago_id
    FROM   financial_schema.boleta_pago bp
    WHERE  bp.id = p_boleta_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Boleta % no encontrada.', p_boleta_id;
    END IF;

    -- 3. Validar que la boleta esté en estado revisable
    IF v_estado_actual <> 'En_Revision' THEN
        RAISE EXCEPTION 'La boleta ya fue procesada (estado actual: %). Solo se pueden revisar boletas En_Revision.', v_estado_actual;
    END IF;

    -- 4. Si el nuevo estado es Rechazada, la observación es obligatoria
    IF p_nuevo_estado = 'Rechazada' AND (p_observacion_rechazo IS NULL OR TRIM(p_observacion_rechazo) = '') THEN
        RAISE EXCEPTION 'La observación de rechazo es obligatoria cuando el estado es Rechazada.';
    END IF;

    -- 5. Determinar el nuevo estado del Pago y la fecha de pago
    v_nuevo_estado_pago := CASE p_nuevo_estado
        WHEN 'Aprobada'  THEN 'Pagado'::financial_schema.estado_pago
        WHEN 'Rechazada' THEN 'Rechazado'::financial_schema.estado_pago
    END;

    v_fecha_pago := CASE WHEN p_nuevo_estado = 'Aprobada' THEN CURRENT_DATE ELSE NULL END;

    -- 6. Actualizar la boleta
    UPDATE financial_schema.boleta_pago
    SET
        estado_revision     = p_nuevo_estado,
        observacion_rechazo = CASE WHEN p_nuevo_estado = 'Rechazada' THEN p_observacion_rechazo ELSE NULL END,
        revisado_por        = p_revisor_id,
        fecha_revision      = NOW()
    WHERE id = p_boleta_id;

    -- 7. Sincronizar el Pago padre
    UPDATE financial_schema.pago
    SET
        estado     = v_nuevo_estado_pago,
        fecha_pago = v_fecha_pago
    WHERE id = v_pago_id;

    -- 8. Notificar al alumno solo si la boleta es Rechazada
    IF p_nuevo_estado = 'Rechazada' THEN
        SELECT al.perfil_usuario_id INTO v_alumno_perfil_id
        FROM   academic_schema.alumno      al
        JOIN   financial_schema.pago       p  ON p.alumno_id = al.id
        WHERE  p.id = v_pago_id;

        v_titulo_notif := 'Boleta de pago rechazada';
        v_cuerpo_notif := 'Tu comprobante de pago fue rechazado. Motivo: ' || p_observacion_rechazo ||
                          '. Por favor, sube un nuevo comprobante corregido.';

        INSERT INTO financial_schema.notificacion (
            usuario_destino_id,
            tipo,
            titulo,
            cuerpo,
            url_accion
        ) VALUES (
            v_alumno_perfil_id,
            'pago',
            v_titulo_notif,
            v_cuerpo_notif,
            '/pagos/' || v_pago_id::TEXT
        );
    END IF;
END;
$$;

COMMENT ON PROCEDURE financial_schema.revisar_boleta IS
    'SP central del flujo de pagos. Valida rol Secretaria/Admin, aplica transición de estado '
    '(En_Revision → Aprobada | Rechazada), sincroniza el Pago padre y genera notificación '
    'automática al Alumno cuando la boleta es rechazada. La observación de rechazo es obligatoria.';


-- ══════════════════════════════════════════════════════════════
-- 9. TRIGGERS DE NEGOCIO Y AUDITORÍA
-- ══════════════════════════════════════════════════════════════

-- ── 9.1 Solo un período académico activo ──────────────────────
CREATE OR REPLACE FUNCTION academic_schema.fn_un_periodo_activo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.activo = TRUE THEN
        UPDATE academic_schema.periodo_academico
        SET    activo = FALSE
        WHERE  id <> NEW.id AND activo = TRUE;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tg_un_periodo_activo
    BEFORE INSERT OR UPDATE OF activo ON academic_schema.periodo_academico
    FOR EACH ROW EXECUTE FUNCTION academic_schema.fn_un_periodo_activo();


-- ── 9.2 Calcular nota_literal automáticamente ─────────────────
CREATE OR REPLACE FUNCTION academic_schema.fn_set_nota_literal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_periodo UUID;
BEGIN
    SELECT pa.id INTO v_periodo
    FROM   academic_schema.bimestre b
    JOIN   academic_schema.periodo_academico pa ON pa.id = b.periodo_id
    WHERE  b.id = NEW.bimestre_id;

    NEW.nota_literal := academic_schema.fn_vigesimal_to_literal(NEW.nota_vigesimal, v_periodo);
    RETURN NEW;
END;
$$;

CREATE TRIGGER tg_set_nota_literal
    BEFORE INSERT OR UPDATE OF nota_vigesimal ON academic_schema.nota
    FOR EACH ROW EXECUTE FUNCTION academic_schema.fn_set_nota_literal();


-- ── 9.3 Bloquear UPDATE de nota cerrada ───────────────────────
CREATE OR REPLACE FUNCTION academic_schema.fn_bloquear_nota_cerrada()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.cerrada = TRUE AND NEW.cerrada = TRUE THEN
        RAISE EXCEPTION 'La nota ID % está cerrada. Requiere autorización del Administrador.', OLD.id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tg_bloquear_nota_cerrada
    BEFORE UPDATE ON academic_schema.nota
    FOR EACH ROW EXECUTE FUNCTION academic_schema.fn_bloquear_nota_cerrada();


-- ── 9.4 Cerrar notas al cerrar bimestre ───────────────────────
CREATE OR REPLACE FUNCTION academic_schema.fn_cerrar_notas_bimestre()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.cerrado = TRUE AND OLD.cerrado = FALSE THEN
        UPDATE academic_schema.nota
        SET    cerrada = TRUE
        WHERE  bimestre_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tg_cerrar_notas_bimestre
    AFTER UPDATE OF cerrado ON academic_schema.bimestre
    FOR EACH ROW EXECUTE FUNCTION academic_schema.fn_cerrar_notas_bimestre();


-- ── 9.5 Validar cruce de horario ──────────────────────────────
CREATE OR REPLACE FUNCTION academic_schema.fn_validar_cruce_horario()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_docente_id  UUID;
    v_seccion_id  UUID;
    v_cruce_count INTEGER;
BEGIN
    SELECT ad.docente_id, ad.seccion_id
    INTO   v_docente_id, v_seccion_id
    FROM   academic_schema.asignacion_docente ad
    WHERE  ad.id = NEW.asignacion_id;

    SELECT COUNT(*) INTO v_cruce_count
    FROM   academic_schema.horario h
    JOIN   academic_schema.asignacion_docente ad ON ad.id = h.asignacion_id
    WHERE  ad.docente_id = v_docente_id
      AND  h.dia_semana  = NEW.dia_semana
      AND  h.id         <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND  h.hora_inicio < NEW.hora_fin
      AND  h.hora_fin    > NEW.hora_inicio;

    IF v_cruce_count > 0 THEN
        RAISE EXCEPTION 'El docente tiene un cruce de horario el día % entre % y %.', NEW.dia_semana, NEW.hora_inicio, NEW.hora_fin;
    END IF;

    SELECT COUNT(*) INTO v_cruce_count
    FROM   academic_schema.horario h
    JOIN   academic_schema.asignacion_docente ad ON ad.id = h.asignacion_id
    WHERE  ad.seccion_id = v_seccion_id
      AND  h.dia_semana  = NEW.dia_semana
      AND  h.id         <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND  h.hora_inicio < NEW.hora_fin
      AND  h.hora_fin    > NEW.hora_inicio;

    IF v_cruce_count > 0 THEN
        RAISE EXCEPTION 'La sección tiene un cruce de horario el día % entre % y %.', NEW.dia_semana, NEW.hora_inicio, NEW.hora_fin;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER tg_validar_cruce_horario
    BEFORE INSERT OR UPDATE ON academic_schema.horario
    FOR EACH ROW EXECUTE FUNCTION academic_schema.fn_validar_cruce_horario();


-- ── 9.6 Sincronizar estado de Pago al insertar BoletaPago ─────
-- Este trigger cubre únicamente el INSERT (alumno sube boleta por
-- primera vez): cambia el Pago de 'Pendiente' a 'En_Revision'.
-- Las transiciones posteriores (Aprobada/Rechazada) son exclusivas
-- del SP revisar_boleta, que incluye validación de rol.
CREATE OR REPLACE FUNCTION financial_schema.fn_boleta_insertada()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE financial_schema.pago
    SET    estado = 'En_Revision'
    WHERE  id     = NEW.pago_id
      AND  estado = 'Pendiente';

    RETURN NEW;
END;
$$;

CREATE TRIGGER tg_boleta_insertada
    AFTER INSERT ON financial_schema.boleta_pago
    FOR EACH ROW EXECUTE FUNCTION financial_schema.fn_boleta_insertada();

COMMENT ON FUNCTION financial_schema.fn_boleta_insertada IS
    'Al insertar una boleta, transiciona el Pago a En_Revision si aún estaba Pendiente.';


-- ── 9.7 Auditoría automática en tablas sensibles ──────────────
CREATE OR REPLACE FUNCTION audit_schema.fn_audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO audit_schema.sesion_auditoria (
        usuario_id,
        tipo_accion,
        modulo,
        entidad_afectada,
        entidad_id,
        old_value,
        new_value,
        ip_origen,
        fecha_hora
    ) VALUES (
        NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID,
        TG_OP::auth_schema.tipo_accion_auditoria,
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN row_to_json(OLD)::JSONB END,
        CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW)::JSONB END,
        (NULLIF(current_setting('request.headers', TRUE), '')::JSONB->>'x-forwarded-for')::inet,
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER tg_audit_nota
    AFTER INSERT OR UPDATE OR DELETE ON academic_schema.nota
    FOR EACH ROW EXECUTE FUNCTION audit_schema.fn_audit_trigger();

CREATE TRIGGER tg_audit_pago
    AFTER INSERT OR UPDATE OR DELETE ON financial_schema.pago
    FOR EACH ROW EXECUTE FUNCTION audit_schema.fn_audit_trigger();

CREATE TRIGGER tg_audit_boleta
    AFTER INSERT OR UPDATE OR DELETE ON financial_schema.boleta_pago
    FOR EACH ROW EXECUTE FUNCTION audit_schema.fn_audit_trigger();

CREATE TRIGGER tg_audit_credencial
    AFTER UPDATE ON auth_schema.credencial
    FOR EACH ROW EXECUTE FUNCTION audit_schema.fn_audit_trigger();


-- ── 9.8 updated_at en Credencial ──────────────────────────────
CREATE OR REPLACE FUNCTION auth_schema.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER tg_credencial_updated_at
    BEFORE UPDATE ON auth_schema.credencial
    FOR EACH ROW EXECUTE FUNCTION auth_schema.fn_set_updated_at();


-- ══════════════════════════════════════════════════════════════
-- 10. POLÍTICAS ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE academic_schema.alumno              ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_schema.nota                ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_schema.asistencia          ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_schema.asistencia_docente  ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_schema.material            ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_schema.actividad           ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_schema.entrega_actividad   ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_schema.pago               ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_schema.boleta_pago        ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_schema.notificacion       ENABLE ROW LEVEL SECURITY;

-- ── Notas ─────────────────────────────────────────────────────
CREATE POLICY "alumno_ve_sus_notas" ON academic_schema.nota
    FOR SELECT USING (
        alumno_id = (
            SELECT entidad_id FROM auth_schema.perfil_usuario
            WHERE credencial_id = auth.uid() AND entidad_tipo = 'alumno'
        )
    );

CREATE POLICY "docente_gestiona_notas_propias" ON academic_schema.nota
    FOR ALL USING (
        docente_id = (
            SELECT entidad_id FROM auth_schema.perfil_usuario
            WHERE credencial_id = auth.uid() AND entidad_tipo = 'docente'
        )
    );

CREATE POLICY "admin_secretaria_acceso_total_notas" ON academic_schema.nota
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_schema.perfil_usuario
            WHERE credencial_id = auth.uid() AND rol IN ('Admin', 'Secretaria')
        )
    );

-- ── Asistencia docentes: solo Admin ───────────────────────────
CREATE POLICY "admin_gestiona_asistencia_docente" ON academic_schema.asistencia_docente
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_schema.perfil_usuario
            WHERE credencial_id = auth.uid() AND rol = 'Admin'
        )
    );

-- ── Actividades ───────────────────────────────────────────────
CREATE POLICY "docente_gestiona_actividades" ON academic_schema.actividad
    FOR ALL USING (
        docente_id = (
            SELECT entidad_id FROM auth_schema.perfil_usuario
            WHERE credencial_id = auth.uid() AND entidad_tipo = 'docente'
        )
    );

CREATE POLICY "alumno_ve_actividades_seccion" ON academic_schema.actividad
    FOR SELECT USING (
        seccion_id = (
            SELECT seccion_id FROM academic_schema.alumno
            WHERE perfil_usuario_id = (
                SELECT id FROM auth_schema.perfil_usuario WHERE credencial_id = auth.uid()
            )
        )
    );

CREATE POLICY "admin_secretaria_ven_actividades" ON academic_schema.actividad
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_schema.perfil_usuario
            WHERE credencial_id = auth.uid() AND rol IN ('Admin', 'Secretaria')
        )
    );

-- ── Entregas ──────────────────────────────────────────────────
CREATE POLICY "alumno_gestiona_sus_entregas" ON academic_schema.entrega_actividad
    FOR ALL USING (
        alumno_id = (
            SELECT entidad_id FROM auth_schema.perfil_usuario
            WHERE credencial_id = auth.uid() AND entidad_tipo = 'alumno'
        )
    );

CREATE POLICY "docente_ve_entregas_de_su_curso" ON academic_schema.entrega_actividad
    FOR SELECT USING (
        actividad_id IN (
            SELECT id FROM academic_schema.actividad
            WHERE docente_id = (
                SELECT entidad_id FROM auth_schema.perfil_usuario
                WHERE credencial_id = auth.uid() AND entidad_tipo = 'docente'
            )
        )
    );

-- ── Materiales ────────────────────────────────────────────────
CREATE POLICY "docente_gestiona_materiales" ON academic_schema.material
    FOR ALL USING (
        docente_id = (
            SELECT entidad_id FROM auth_schema.perfil_usuario
            WHERE credencial_id = auth.uid() AND entidad_tipo = 'docente'
        )
    );

CREATE POLICY "alumno_ve_materiales_seccion" ON academic_schema.material
    FOR SELECT USING (
        seccion_id = (
            SELECT seccion_id FROM academic_schema.alumno
            WHERE perfil_usuario_id = (
                SELECT id FROM auth_schema.perfil_usuario WHERE credencial_id = auth.uid()
            )
        ) AND visible = TRUE
    );

-- ── Pagos ─────────────────────────────────────────────────────
CREATE POLICY "alumno_ve_sus_pagos" ON financial_schema.pago
    FOR SELECT USING (
        alumno_id = (
            SELECT entidad_id FROM auth_schema.perfil_usuario
            WHERE credencial_id = auth.uid() AND entidad_tipo = 'alumno'
        )
    );

CREATE POLICY "admin_secretaria_gestionan_pagos" ON financial_schema.pago
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_schema.perfil_usuario
            WHERE credencial_id = auth.uid() AND rol IN ('Admin', 'Secretaria')
        )
    );

-- ── Boletas ───────────────────────────────────────────────────
CREATE POLICY "alumno_sube_su_boleta" ON financial_schema.boleta_pago
    FOR INSERT WITH CHECK (
        pago_id IN (
            SELECT id FROM financial_schema.pago
            WHERE alumno_id = (
                SELECT entidad_id FROM auth_schema.perfil_usuario
                WHERE credencial_id = auth.uid() AND entidad_tipo = 'alumno'
            )
        )
    );

CREATE POLICY "alumno_ve_su_boleta" ON financial_schema.boleta_pago
    FOR SELECT USING (
        pago_id IN (
            SELECT id FROM financial_schema.pago
            WHERE alumno_id = (
                SELECT entidad_id FROM auth_schema.perfil_usuario
                WHERE credencial_id = auth.uid() AND entidad_tipo = 'alumno'
            )
        )
    );

CREATE POLICY "secretaria_admin_revisan_boletas" ON financial_schema.boleta_pago
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth_schema.perfil_usuario
            WHERE credencial_id = auth.uid() AND rol IN ('Admin', 'Secretaria')
        )
    );

-- ── Notificaciones ────────────────────────────────────────────
CREATE POLICY "usuario_ve_sus_notificaciones" ON financial_schema.notificacion
    FOR ALL USING (
        usuario_destino_id = (
            SELECT id FROM auth_schema.perfil_usuario
            WHERE credencial_id = auth.uid()
        )
    );


-- ══════════════════════════════════════════════════════════════
-- 11. VISTAS Y VISTAS MATERIALIZADAS
-- ══════════════════════════════════════════════════════════════

-- ── 11.1 Vista materializada: libreta del alumno ──────────────
CREATE MATERIALIZED VIEW academic_schema.mv_libreta_alumno AS
SELECT
    a.id                                              AS alumno_id,
    a.nombres || ' ' || a.apellido_paterno            AS alumno_nombre,
    g.nombre                                          AS grado,
    s.nombre                                          AS seccion,
    c.nombre                                          AS curso,
    comp.nombre                                       AS competencia,
    comp.tipo                                         AS tipo_competencia,
    b.numero                                          AS bimestre,
    b.nombre                                          AS nombre_bimestre,
    n.nota_vigesimal,
    n.nota_literal,
    n.tipo_evaluacion,
    n.observacion,
    n.cerrada,
    n.fecha_registro,
    financial_schema.fn_bloquea_libreta(a.id)        AS bloquea_libreta
FROM   academic_schema.nota             n
JOIN   academic_schema.alumno           a    ON a.id    = n.alumno_id
JOIN   academic_schema.seccion          s    ON s.id    = a.seccion_id
JOIN   academic_schema.grado            g    ON g.id    = s.grado_id
JOIN   academic_schema.competencia      comp ON comp.id = n.competencia_id
JOIN   academic_schema.curso            c    ON c.id    = comp.curso_id
JOIN   academic_schema.bimestre         b    ON b.id    = n.bimestre_id;

CREATE UNIQUE INDEX ON academic_schema.mv_libreta_alumno(alumno_id, curso, competencia, bimestre);

COMMENT ON MATERIALIZED VIEW academic_schema.mv_libreta_alumno
    IS 'Libreta consolidada. bloquea_libreta=TRUE si hay deuda pendiente O bloqueo_manual activo.';


-- ── 11.2 Vista: resumen de asistencia de alumnos ─────────────
CREATE VIEW academic_schema.v_resumen_asistencia AS
SELECT
    al.id                                             AS alumno_id,
    al.nombres || ' ' || al.apellido_paterno          AS alumno_nombre,
    s.id                                              AS seccion_id,
    COUNT(*) FILTER (WHERE a.estado = 'P')            AS total_presentes,
    COUNT(*) FILTER (WHERE a.estado = 'F')            AS total_faltas,
    COUNT(*) FILTER (WHERE a.estado = 'T')            AS total_tardanzas,
    COUNT(*) FILTER (WHERE a.estado = 'J')            AS total_justificados,
    COUNT(*)                                          AS total_dias_registrados,
    ROUND(
        COUNT(*) FILTER (WHERE a.estado = 'P') * 100.0
        / NULLIF(COUNT(*), 0), 1
    )                                                 AS porcentaje_asistencia
FROM   academic_schema.asistencia a
JOIN   academic_schema.alumno     al ON al.id = a.alumno_id
JOIN   academic_schema.seccion    s  ON s.id  = a.seccion_id
GROUP  BY al.id, al.nombres, al.apellido_paterno, s.id;

COMMENT ON VIEW academic_schema.v_resumen_asistencia IS 'Resumen de asistencia de alumnos con porcentaje calculado.';


-- ── 11.3 Vista: estado de pagos por alumno ────────────────────
CREATE VIEW financial_schema.v_estado_pagos_alumno AS
SELECT
    a.id                                              AS alumno_id,
    a.nombres || ' ' || a.apellido_paterno            AS alumno_nombre,
    g.nombre                                          AS grado,
    sec.nombre                                        AS seccion,
    p.id                                              AS pago_id,
    cp.nombre                                         AS concepto,
    p.mes,
    p.monto,
    p.estado,
    p.fecha_vencimiento,
    p.fecha_pago,
    bp.estado_revision                                AS estado_boleta,
    bp.observacion_rechazo
FROM   financial_schema.pago           p
JOIN   academic_schema.alumno          a   ON a.id   = p.alumno_id
JOIN   academic_schema.seccion         sec ON sec.id = a.seccion_id
JOIN   academic_schema.grado           g   ON g.id   = sec.grado_id
JOIN   financial_schema.concepto_pago  cp  ON cp.id  = p.concepto_id
LEFT   JOIN financial_schema.boleta_pago bp ON bp.pago_id = p.id;

COMMENT ON VIEW financial_schema.v_estado_pagos_alumno IS 'Estado de pagos con detalle de boleta y observación de rechazo.';


-- ── 11.4 Vista materializada: formato SIAGIE ─────────────────
CREATE MATERIALIZED VIEW audit_schema.formato_siagie AS
SELECT
    ie.codigo_ugel                                    AS codigo_ugel,
    ie.nombre_ugel                                    AS nombre_ugel,
    ie.nombre                                         AS nombre_ie,
    ie.codigo_modular                                 AS codigo_modular,
    ie.resolucion_creacion                            AS resolucion_creacion,
    ie.modalidad                                      AS modalidad,
    ie.gestion                                        AS gestion,
    ie.departamento                                   AS departamento,
    ie.provincia                                      AS provincia,
    ie.distrito                                       AS distrito,
    ie.centro_poblado                                 AS centro_poblado,
    pa.fecha_inicio                                   AS fecha_inicio_periodo,
    pa.fecha_fin                                      AS fecha_fin_periodo,
    pa.año                                            AS anio_escolar,
    g.nombre                                          AS grado,
    s.nombre                                          AS seccion,
    s.turno                                           AS turno,
    ROW_NUMBER() OVER (
        PARTITION BY s.id, pa.id
        ORDER BY a.apellido_paterno, a.apellido_materno, a.nombres
    )                                                 AS numero_orden,
    a.codigo_siagie                                   AS codigo_estudiante,
    a.dni                                             AS numero_documento,
    a.apellido_paterno                                AS apellido_paterno,
    a.apellido_materno                                AS apellido_materno,
    a.nombres                                         AS nombres,
    a.sexo                                            AS sexo,
    niv.nombre                                        AS nivel_educativo,
    c.nombre                                          AS curso,
    c.codigo_cneb                                     AS codigo_cneb,
    comp.nombre                                       AS competencia,
    b.numero                                          AS numero_bimestre,
    b.nombre                                          AS bimestre,
    n.nota_vigesimal,
    n.nota_literal,
    n.tipo_evaluacion                                 AS tipo_evaluacion,
    sfa.comportamiento                                AS comportamiento,
    sfa.numero_areas_desaprobadas                     AS numero_areas_desaprobadas,
    sfa.situacion_final                               AS situacion_final,
    sfa.motivo_retiro                                 AS motivo_retiro,
    sfa.observaciones                                 AS observaciones,
    n.fecha_registro                                  AS fecha_registro_nota,
    pa.id                                             AS periodo_id,
    a.id                                              AS alumno_id,
    s.id                                              AS seccion_id
FROM   academic_schema.nota                   n
JOIN   academic_schema.alumno                 a    ON a.id      = n.alumno_id
JOIN   academic_schema.seccion                s    ON s.id      = a.seccion_id
JOIN   academic_schema.grado                  g    ON g.id      = s.grado_id
JOIN   academic_schema.nivel                  niv  ON niv.id    = g.nivel_id
JOIN   academic_schema.periodo_academico      pa   ON pa.id     = s.periodo_id
JOIN   academic_schema.competencia            comp ON comp.id   = n.competencia_id
JOIN   academic_schema.curso                  c    ON c.id      = comp.curso_id
JOIN   academic_schema.bimestre               b    ON b.id      = n.bimestre_id
JOIN   academic_schema.institucion_educativa  ie   ON ie.activo = TRUE
LEFT   JOIN academic_schema.situacion_final_alumno sfa
       ON  sfa.alumno_id  = a.id
       AND sfa.periodo_id = pa.id
ORDER  BY
    pa.año,
    g.orden,
    s.nombre,
    a.apellido_paterno,
    a.apellido_materno,
    c.nombre,
    b.numero;

CREATE UNIQUE INDEX ON audit_schema.formato_siagie
    (periodo_id, seccion_id, alumno_id, curso, competencia, numero_bimestre);

CREATE INDEX idx_formato_siagie_periodo  ON audit_schema.formato_siagie(anio_escolar, grado, seccion);
CREATE INDEX idx_formato_siagie_alumno   ON audit_schema.formato_siagie(numero_documento, anio_escolar);

COMMENT ON MATERIALIZED VIEW audit_schema.formato_siagie IS
    'Acta oficial MINEDU/SIAGIE. Cabecera IE, datos del alumno, notas y situación final.
     Refrescar al cerrar cada bimestre o año lectivo.
     Comando: REFRESH MATERIALIZED VIEW CONCURRENTLY audit_schema.formato_siagie;';


-- ══════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT
-- ══════════════════════════════════════════════════════════════
--
--  Resumen de objetos — v2.0:
--    Esquemas             : 4
--    Tipos ENUM           : 13
--    Tablas               : 21  (se eliminó Matrícula)
--    Índices              : 32
--    Funciones            : 6
--    Procedure            : 1   (revisar_boleta — nuevo)
--    Triggers             : 8
--    Políticas RLS        : 16
--    Vistas               : 2
--    Vistas materializadas: 2   (mv_libreta_alumno, formato_siagie)
--
--  Cambios principales respecto a v1:
--    · Entidad Matrícula eliminada por completo.
--    · Atributos de apoderado eliminados de Alumno.
--    · Roles restringidos a: Admin, Secretaria, Docente, Alumno.
--    · Estado inicial de boleta: 'En_Revision' (antes 'Por_Revisar').
--    · Estado pago simplificado: Pendiente | En_Revision | Pagado | Rechazado.
--    · SP revisar_boleta reemplaza al trigger fn_sync_estado_pago:
--        - Valida rol del revisor (Secretaria/Admin).
--        - Exige observacion_rechazo cuando estado = Rechazada.
--        - Genera notificación automática al Alumno al rechazar.
--        - Sincroniza estado del Pago padre en la misma transacción.
--    · Trigger fn_boleta_insertada cubre la transición inicial
--      Pendiente → En_Revision al subir comprobante.
--
--  Mantenimiento de vistas materializadas:
--    REFRESH MATERIALIZED VIEW CONCURRENTLY academic_schema.mv_libreta_alumno;
--    REFRESH MATERIALIZED VIEW CONCURRENTLY audit_schema.formato_siagie;
-- ============================================================

CREATE POLICY "docente_actualiza_entregas_de_su_curso" ON academic_schema.entrega_actividad
    FOR UPDATE WITH CHECK (
        actividad_id IN (
            SELECT id FROM academic_schema.actividad
            WHERE docente_id = (
                SELECT entidad_id FROM auth_schema.perfil_usuario
                WHERE credencial_id = auth.uid() AND entidad_tipo = 'docente'
            )
        )
    );
