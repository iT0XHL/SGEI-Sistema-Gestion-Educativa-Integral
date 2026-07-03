-- ============================================================
--  07-horarios-publicacion.sql — Módulo de Gestión de Horarios
--  · Blindaje real de cruces (EXCLUDE constraint vía btree_gist),
--    complementario al trigger existente tg_validar_cruce_horario
--    (que solo hace un COUNT(*) dentro del BEFORE, vulnerable a
--    una carrera entre dos transacciones concurrentes).
--  · Tablas de publicación: snapshot vigente (sin historial) del
--    horario visible a Docente/Alumno, desacoplado del borrador
--    editable (academic_schema.horario). Republicar sobrescribe.
--  Idempotente donde es razonable (IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ── 1. Denormalizar docente_id/seccion_id en horario ───────────
-- Necesario porque una EXCLUDE constraint solo puede referenciar
-- columnas de la propia tabla, y horario solo tiene asignacion_id
-- (docente/sección se resuelven hoy vía JOIN a asignacion_docente).
ALTER TABLE academic_schema.horario
  ADD COLUMN IF NOT EXISTS docente_id UUID,
  ADD COLUMN IF NOT EXISTS seccion_id UUID;

UPDATE academic_schema.horario h
SET    docente_id = ad.docente_id,
       seccion_id = ad.seccion_id
FROM   academic_schema.asignacion_docente ad
WHERE  ad.id = h.asignacion_id
  AND  (h.docente_id IS NULL OR h.seccion_id IS NULL);

ALTER TABLE academic_schema.horario
  ALTER COLUMN docente_id SET NOT NULL,
  ALTER COLUMN seccion_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'horario_docente_id_fkey'
  ) THEN
    ALTER TABLE academic_schema.horario
      ADD CONSTRAINT horario_docente_id_fkey
      FOREIGN KEY (docente_id) REFERENCES academic_schema.docente(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'horario_seccion_id_fkey'
  ) THEN
    ALTER TABLE academic_schema.horario
      ADD CONSTRAINT horario_seccion_id_fkey
      FOREIGN KEY (seccion_id) REFERENCES academic_schema.seccion(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_horario_docente_id ON academic_schema.horario(docente_id);
CREATE INDEX IF NOT EXISTS idx_horario_seccion_id ON academic_schema.horario(seccion_id);

-- ── 2. Fusionar la denormalización en el trigger existente ─────
-- fn_validar_cruce_horario ya resuelve docente_id/seccion_id desde
-- asignacion_docente para validar cruces; se reutiliza ese mismo
-- cálculo para además poblar NEW.docente_id/NEW.seccion_id en cada
-- INSERT/UPDATE, evitando un segundo trigger y cualquier duda de
-- orden de ejecución entre triggers BEFORE. CREATE OR REPLACE no
-- requiere tocar la definición de tg_validar_cruce_horario.
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

    NEW.docente_id := v_docente_id;
    NEW.seccion_id := v_seccion_id;

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

-- ── 3. EXCLUDE constraint (blindaje atómico a nivel de motor) ──
-- El trigger anterior es un COUNT(*) clásico dentro de un BEFORE:
-- dos transacciones concurrentes podrían pasar ambas el check antes
-- de que cualquiera haga commit. La EXCLUDE constraint es atómica
-- (se apoya en un índice GIST) e independiente del nivel de
-- aislamiento de la transacción — última línea de defensa real.
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'excl_horario_cruce_docente'
  ) THEN
    ALTER TABLE academic_schema.horario
      ADD CONSTRAINT excl_horario_cruce_docente
      EXCLUDE USING gist (
        docente_id WITH =,
        dia_semana WITH =,
        tsrange(DATE '2000-01-01' + hora_inicio, DATE '2000-01-01' + hora_fin, '[)') WITH &&
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'excl_horario_cruce_seccion'
  ) THEN
    ALTER TABLE academic_schema.horario
      ADD CONSTRAINT excl_horario_cruce_seccion
      EXCLUDE USING gist (
        seccion_id WITH =,
        dia_semana WITH =,
        tsrange(DATE '2000-01-01' + hora_inicio, DATE '2000-01-01' + hora_fin, '[)') WITH &&
      );
  END IF;
END $$;

-- ── 4. Publicación: snapshot vigente por docente o por sección ──
-- Sin versionado histórico (decisión de negocio): cada "Publicar"
-- sobrescribe la fila existente (upsert) y reemplaza sus bloques.
-- La auditoría general (audit_schema.sesion_auditoria, vía
-- AuditService.log() en el backend) ya registra quién/cuándo
-- publicó, sin necesidad de una tabla de historial dedicada aquí.
CREATE TABLE IF NOT EXISTS academic_schema.horario_publicacion (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo              VARCHAR(10) NOT NULL CHECK (tipo IN ('DOCENTE', 'SECCION')),
    docente_id        UUID        REFERENCES academic_schema.docente(id) ON DELETE CASCADE,
    seccion_id        UUID        REFERENCES academic_schema.seccion(id) ON DELETE CASCADE,
    periodo_id        UUID        NOT NULL REFERENCES academic_schema.periodo_academico(id) ON DELETE CASCADE,
    publicado_por     UUID        NOT NULL REFERENCES auth_schema.perfil_usuario(id) ON DELETE RESTRICT,
    fecha_publicacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_horario_publicacion_entidad CHECK (
        (tipo = 'DOCENTE' AND docente_id IS NOT NULL AND seccion_id IS NULL) OR
        (tipo = 'SECCION' AND seccion_id IS NOT NULL AND docente_id IS NULL)
    )
);

COMMENT ON TABLE academic_schema.horario_publicacion IS 'Snapshot vigente (sin historial) del horario publicado a Docente o a una Sección. Republicar sobrescribe.';

CREATE UNIQUE INDEX IF NOT EXISTS ux_horario_publicacion_docente
  ON academic_schema.horario_publicacion(docente_id, periodo_id) WHERE tipo = 'DOCENTE';
CREATE UNIQUE INDEX IF NOT EXISTS ux_horario_publicacion_seccion
  ON academic_schema.horario_publicacion(seccion_id, periodo_id) WHERE tipo = 'SECCION';

CREATE TABLE IF NOT EXISTS academic_schema.horario_publicacion_bloque (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    publicacion_id          UUID         NOT NULL REFERENCES academic_schema.horario_publicacion(id) ON DELETE CASCADE,
    horario_id_origen       UUID,
    dia_semana              SMALLINT     NOT NULL CHECK (dia_semana BETWEEN 1 AND 6),
    hora_inicio             TIME         NOT NULL,
    hora_fin                TIME         NOT NULL CHECK (hora_fin > hora_inicio),
    aula_snapshot           VARCHAR(20),
    curso_nombre_snapshot   VARCHAR(120) NOT NULL,
    docente_nombre_snapshot VARCHAR(160) NOT NULL,
    seccion_nombre_snapshot VARCHAR(20)  NOT NULL,
    grado_nombre_snapshot   VARCHAR(30)  NOT NULL,
    nivel_nombre_snapshot   VARCHAR(30)  NOT NULL
);

COMMENT ON TABLE academic_schema.horario_publicacion_bloque IS 'Bloques del snapshot publicado, desnormalizados: no cambian si el borrador se edita después de publicar. Sin FK viva hacia horario (horario_id_origen es solo informativo).';

CREATE INDEX IF NOT EXISTS idx_horario_publicacion_bloque_publicacion
  ON academic_schema.horario_publicacion_bloque(publicacion_id);

-- ── 5. Aula ──────────────────────────────────────────────────
-- Sin cambios a propósito: "aula" en este módulo equivale a
-- Grado + Sección + Nivel (ya modelado), no a un ambiente físico.
-- El campo horario.aula (texto libre) queda como etiqueta
-- informativa opcional, sin entidad ni validación de colisión
-- adicional — fuera de alcance por decisión del usuario.
