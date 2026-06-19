-- ============================================================
--  SGEI — Migración v2.2: Módulo formal de libretas
--  Tablas de snapshot, revisión, plantilla y workflow de
--  publicación para el módulo de libretas individuales.
--  No modifica tablas existentes. No rompe mv_libreta_alumno.
-- ============================================================

-- ── ENUM: estado_libreta ──────────────────────────────────────
CREATE TYPE academic_schema.estado_libreta AS ENUM (
    'BORRADOR',
    'EN_REVISION',
    'OBSERVADA',
    'APROBADA',
    'PUBLICADA',
    'BLOQUEADA',
    'ANULADA'
);

COMMENT ON TYPE academic_schema.estado_libreta IS 'Workflow de la libreta individual. BORRADOR→EN_REVISION→APROBADA→PUBLICADA. BLOQUEADA/ANULADA son estados terminales.';

-- ── Tabla: plantilla_libreta ──────────────────────────────────
CREATE TABLE academic_schema.plantilla_libreta (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(120) NOT NULL,
    descripcion TEXT,
    version     VARCHAR(20)  NOT NULL DEFAULT '1.0',
    ruta_archivo VARCHAR(255),
    formato     VARCHAR(20)  NOT NULL DEFAULT 'A4' CHECK (formato IN ('A4', 'Letter')),
    activa      BOOLEAN      NOT NULL DEFAULT FALSE,
    config_json JSONB        NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  academic_schema.plantilla_libreta IS 'Plantillas de formato de libreta. Solo una puede estar activa.';
COMMENT ON COLUMN academic_schema.plantilla_libreta.config_json IS 'Configuración flexible: orden de cursos, fuente, márgenes, colores, etc.';

CREATE UNIQUE INDEX ON academic_schema.plantilla_libreta(activa) WHERE activa = TRUE;

-- ── Tabla: libreta (snapshot de la libreta por alumno/período/bimestre) ──
CREATE TABLE academic_schema.libreta (
    id               UUID                          PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id        UUID                          NOT NULL REFERENCES academic_schema.alumno(id) ON DELETE RESTRICT,
    periodo_id       UUID                          NOT NULL REFERENCES academic_schema.periodo_academico(id) ON DELETE RESTRICT,
    bimestre_id      UUID                          NOT NULL REFERENCES academic_schema.bimestre(id) ON DELETE RESTRICT,
    plantilla_id     UUID                          REFERENCES academic_schema.plantilla_libreta(id) ON DELETE SET NULL,
    estado           academic_schema.estado_libreta NOT NULL DEFAULT 'BORRADOR',
    version          INTEGER                       NOT NULL DEFAULT 1,
    generada_por     UUID                          REFERENCES auth_schema.perfil_usuario(id) ON DELETE SET NULL,
    aprobada_por     UUID                          REFERENCES auth_schema.perfil_usuario(id) ON DELETE SET NULL,
    publicada_por    UUID                          REFERENCES auth_schema.perfil_usuario(id) ON DELETE SET NULL,
    fecha_generacion TIMESTAMPTZ,
    fecha_aprobacion TIMESTAMPTZ,
    fecha_publicacion TIMESTAMPTZ,
    pdf_url          TEXT,
    pdf_hash         VARCHAR(64),
    bloqueada        BOOLEAN                       NOT NULL DEFAULT FALSE,
    motivo_bloqueo   TEXT,
    created_at       TIMESTAMPTZ                   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ                   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  academic_schema.libreta IS 'Snapshot de la libreta generada. Una vez publicada, no se modifica sin nueva versión.';
COMMENT ON COLUMN academic_schema.libreta.version IS 'Se incrementa al regenerar la libreta (por corrección de notas).';
COMMENT ON COLUMN academic_schema.libreta.pdf_hash IS 'SHA-256 del PDF generado para verificar integridad.';

CREATE UNIQUE INDEX ON academic_schema.libreta(alumno_id, periodo_id, bimestre_id);
CREATE INDEX ON academic_schema.libreta(estado);
CREATE INDEX ON academic_schema.libreta(bimestre_id);
CREATE INDEX ON academic_schema.libreta(alumno_id);

-- ── Tabla: libreta_detalle (cursos y competencias en snapshot) ──
CREATE TABLE academic_schema.libreta_detalle (
    id                     UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    libreta_id             UUID            NOT NULL REFERENCES academic_schema.libreta(id) ON DELETE CASCADE,
    curso_id               UUID            NOT NULL REFERENCES academic_schema.curso(id) ON DELETE RESTRICT,
    curso_nombre_snapshot  VARCHAR(120)    NOT NULL,
    competencia_id         UUID            NOT NULL REFERENCES academic_schema.competencia(id) ON DELETE RESTRICT,
    competencia_nombre_snapshot VARCHAR(200) NOT NULL,
    tipo_competencia       VARCHAR(20)     NOT NULL DEFAULT 'regular',
    bimestre_numero        SMALLINT        NOT NULL,
    nota_vigesimal         DECIMAL(4,2),
    nota_literal           academic_schema.nota_literal,
    calificativo_area      DECIMAL(4,2),
    orden_curso            SMALLINT        NOT NULL DEFAULT 0,
    orden_competencia      SMALLINT        NOT NULL DEFAULT 0,
    observacion            TEXT
);

COMMENT ON TABLE academic_schema.libreta_detalle IS 'Detalle con snapshot de cursos, competencias y notas al momento de generar la libreta.';

CREATE INDEX ON academic_schema.libreta_detalle(libreta_id);
CREATE INDEX ON academic_schema.libreta_detalle(curso_id);

-- ── Tabla: libreta_conclusion (conclusiones descriptivas por bimestre) ──
CREATE TABLE academic_schema.libreta_conclusion (
    id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    libreta_id             UUID          NOT NULL REFERENCES academic_schema.libreta(id) ON DELETE CASCADE,
    bimestre_id            UUID          NOT NULL REFERENCES academic_schema.bimestre(id) ON DELETE RESTRICT,
    conclusion_descriptiva TEXT          NOT NULL,
    registrado_por         UUID          NOT NULL REFERENCES auth_schema.perfil_usuario(id) ON DELETE RESTRICT,
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE academic_schema.libreta_conclusion IS 'Conclusiones descriptivas por bimestre para la libreta del alumno.';

CREATE UNIQUE INDEX ON academic_schema.libreta_conclusion(libreta_id, bimestre_id);

-- ── Tabla: libreta_asistencia_resumen ──────────────────────────
CREATE TABLE academic_schema.libreta_asistencia_resumen (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    libreta_id                  UUID        NOT NULL REFERENCES academic_schema.libreta(id) ON DELETE CASCADE,
    bimestre_id                 UUID        NOT NULL REFERENCES academic_schema.bimestre(id) ON DELETE RESTRICT,
    inasistencias_justificadas  SMALLINT    NOT NULL DEFAULT 0 CHECK (inasistencias_justificadas >= 0),
    inasistencias_injustificadas SMALLINT   NOT NULL DEFAULT 0 CHECK (inasistencias_injustificadas >= 0),
    tardanzas_justificadas      SMALLINT    NOT NULL DEFAULT 0 CHECK (tardanzas_justificadas >= 0),
    tardanzas_injustificadas    SMALLINT    NOT NULL DEFAULT 0 CHECK (tardanzas_injustificadas >= 0)
);

COMMENT ON TABLE academic_schema.libreta_asistencia_resumen IS 'Resumen de asistencia por bimestre para la libreta. Se genera al crear la libreta.';

CREATE UNIQUE INDEX ON academic_schema.libreta_asistencia_resumen(libreta_id, bimestre_id);

-- ── Tabla: libreta_revision (historial de cambios de estado) ──
CREATE TABLE audit_schema.libreta_revision (
    id             UUID                           PRIMARY KEY DEFAULT gen_random_uuid(),
    libreta_id     UUID                           NOT NULL REFERENCES academic_schema.libreta(id) ON DELETE CASCADE,
    estado_anterior academic_schema.estado_libreta,
    estado_nuevo   academic_schema.estado_libreta NOT NULL,
    observacion    TEXT,
    usuario_id     UUID                           NOT NULL REFERENCES auth_schema.perfil_usuario(id) ON DELETE RESTRICT,
    created_at     TIMESTAMPTZ                    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_schema.libreta_revision IS 'Auditoría de cambios de estado en la libreta. Registro inmutable.';

CREATE INDEX ON audit_schema.libreta_revision(libreta_id);
CREATE INDEX ON audit_schema.libreta_revision(usuario_id);

-- ══════════════════════════════════════════════════════════════
--  ACTUALIZAR mv_libreta_alumno (no romper, solo agregar soporte)
--  La MV existente NO se modifica. Esta consulta es solo de
--  referencia para refrescar manualmente si se desea.
-- ══════════════════════════════════════════════════════════════
