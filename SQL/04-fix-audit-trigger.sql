-- ============================================================================
--  Migración 04 — Corrige audit_schema.fn_audit_trigger()
--  (bug de enum: 'INSERT' vs 'CREATE')
--
--  El trigger de auditoría casteaba TG_OP directamente al enum
--  auth_schema.tipo_accion_auditoria, pero TG_OP = 'INSERT' NO existe en ese
--  enum (sus valores son CREATE/UPDATE/DELETE/...). Resultado: TODO INSERT en
--  una tabla auditada (nota, pago, boleta_pago, credencial) fallaba con
--  22P02 "invalid input value for enum ... INSERT". Por eso el seed
--  desactivaba los triggers (session_replication_role = replica).
--
--  Síntoma de cara al usuario: el docente NO podía registrar notas nuevas
--  (POST /api/notas -> 500). Las UPDATE/DELETE sí funcionaban porque esos
--  valores de TG_OP ya coinciden con el enum.
--
--  Fix: mapear 'INSERT' -> 'CREATE'. Idempotente (CREATE OR REPLACE). Los 4
--  triggers (tg_audit_nota/pago/boleta/credencial) usan esta función por
--  nombre, así que el arreglo aplica a todos automáticamente.
-- ============================================================================

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
        (CASE TG_OP WHEN 'INSERT' THEN 'CREATE' ELSE TG_OP END)::auth_schema.tipo_accion_auditoria,
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
