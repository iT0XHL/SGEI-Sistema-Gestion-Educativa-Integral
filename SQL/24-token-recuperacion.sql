-- ============================================================
--  24-token-recuperacion.sql
--  Tabla de tokens de un solo uso para el flujo de "olvidé mi
--  contraseña" (self-service, vía email = auth_schema.credencial.usuario_login).
--  El token en claro nunca se persiste: se guarda solo su sha256.
-- ============================================================

CREATE TABLE IF NOT EXISTS auth_schema.token_recuperacion (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credencial_id UUID NOT NULL REFERENCES auth_schema.credencial(id) ON DELETE CASCADE,
  token_hash    VARCHAR(64) NOT NULL UNIQUE,
  expira_en     TIMESTAMPTZ NOT NULL,
  usado         BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_token_recuperacion_credencial
  ON auth_schema.token_recuperacion (credencial_id);
