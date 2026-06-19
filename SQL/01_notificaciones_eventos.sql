-- ============================================================================
--  Migración 01 — Sistema de notificaciones por eventos
--  Documento de referencia: NOTIFICACIONES_REFACTORIZAR.md (§8, §9, §20)
--
--  Amplía financial_schema.notificacion para soportar notificaciones
--  basadas en eventos: actor, evento, entidad afectada, prioridad,
--  metadata, canal, idempotencia y expiración.
--
--  Es ADITIVA y segura: todas las columnas nuevas son NULL-ables o tienen
--  DEFAULT, por lo que las filas y el código existentes siguen funcionando.
--  Idempotente: usa IF NOT EXISTS / DO-blocks para poder re-ejecutarse.
-- ============================================================================

BEGIN;

-- ── 1. Columnas nuevas (§8) ────────────────────────────────────────────────
ALTER TABLE financial_schema.notificacion
    ADD COLUMN IF NOT EXISTS actor_id              UUID,
    ADD COLUMN IF NOT EXISTS actor_rol             VARCHAR(20),
    ADD COLUMN IF NOT EXISTS actor_nombre_snapshot VARCHAR(150),
    ADD COLUMN IF NOT EXISTS evento                VARCHAR(50),
    ADD COLUMN IF NOT EXISTS entidad_tipo          VARCHAR(40),
    ADD COLUMN IF NOT EXISTS entidad_id            UUID,
    ADD COLUMN IF NOT EXISTS prioridad             VARCHAR(10)  NOT NULL DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS metadata              JSONB,
    ADD COLUMN IF NOT EXISTS canal                 VARCHAR(15)  NOT NULL DEFAULT 'app',
    ADD COLUMN IF NOT EXISTS idempotency_key       VARCHAR(200),
    ADD COLUMN IF NOT EXISTS archivada             BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS expires_at            TIMESTAMPTZ;

-- FK del actor → perfil_usuario (SET NULL para no borrar la traza si el actor desaparece)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_notificacion_actor'
    ) THEN
        ALTER TABLE financial_schema.notificacion
            ADD CONSTRAINT fk_notificacion_actor
            FOREIGN KEY (actor_id) REFERENCES auth_schema.perfil_usuario(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- ── 2. Idempotencia: clave única para evitar duplicados (§20) ───────────────
-- UNIQUE permite múltiples NULL en PostgreSQL, así que las notificaciones
-- sin clave (comunicados manuales legacy) no chocan entre sí.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notificacion_idempotency
    ON financial_schema.notificacion(idempotency_key);

-- ── 3. Índices de rendimiento (§9) ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notificacion_destino_leida_created
    ON financial_schema.notificacion(usuario_destino_id, leida, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notificacion_evento
    ON financial_schema.notificacion(evento);

CREATE INDEX IF NOT EXISTS idx_notificacion_actor
    ON financial_schema.notificacion(actor_id);

CREATE INDEX IF NOT EXISTS idx_notificacion_entidad
    ON financial_schema.notificacion(entidad_tipo, entidad_id);

COMMIT;

-- ============================================================================
--  NOTA SOBRE DUPLICADOS CON EL SP revisar_boleta (§26.18)
--  El procedimiento financial_schema.revisar_boleta inserta una notificación
--  SOLO cuando la boleta es Rechazada. Para evitar duplicados, el backend
--  (BoletaService.revisar) emite el evento BOLETA_REVISADA únicamente en el
--  caso Aprobada. El caso Rechazada se mantiene gestionado por el SP.
--  No se modifica el SP para preservar el flujo de pagos existente.
-- ============================================================================
