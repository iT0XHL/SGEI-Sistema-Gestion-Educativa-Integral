-- ============================================================
-- PostgreSQL 15 Setup — Prepara el entorno antes del DDL
-- ============================================================
-- Este script se ejecuta ANTES del DDL principal para asegurar
-- que todos los schemas y funciones necesarias existan.

-- Crear schema auth si no existe (para compatibilidad con Supabase DDL)
CREATE SCHEMA IF NOT EXISTS auth;

-- Crear función uid() que devuelve el user_id actual desde app.current_user_id
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT COALESCE(
    (current_setting('app.current_user_id', true)::uuid),
    NULL::uuid
  );
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION auth.uid() IS 'Devuelve el UUID del usuario actual desde app.current_user_id';

