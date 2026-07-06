-- ══════════════════════════════════════════════════════════════
-- Migration 26: Agrega columna debe_cambiar_password a
-- auth_schema.credencial para el flujo de cambio obligatorio
-- de contraseña (primer inicio o reseteo por secretaría/admin).
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth_schema'
      AND table_name = 'credencial'
      AND column_name = 'debe_cambiar_password'
  ) THEN
    ALTER TABLE auth_schema.credencial
      ADD COLUMN debe_cambiar_password BOOLEAN NOT NULL DEFAULT FALSE;

    COMMENT ON COLUMN auth_schema.credencial.debe_cambiar_password
      IS 'TRUE = el usuario debe cambiar su contraseña en el próximo inicio de sesión (nueva cuenta o reseteo por admin/secretaría).';
  END IF;
END $$;
