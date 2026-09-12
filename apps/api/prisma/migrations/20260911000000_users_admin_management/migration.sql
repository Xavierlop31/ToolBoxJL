-- ToolBox JL — Épica 16 (Gestión de Usuarios y Roles), pedido directo del
-- Arquitecto 2026-09-11 — no viene del PRD original de ninguna Fase.
--
-- Agrega `public.users.activo` (por defecto `true`, todo usuario existente
-- queda activo) y actualiza el `custom_access_token_hook` (migración
-- 20260830120000_custom_access_token_hook) para que también copie `activo`
-- a `app_metadata.activo` — mismo mecanismo exacto que ya usa para `rol`,
-- reusado a propósito (decisión confirmada con el Arquitecto): un usuario
-- desactivado no puede volver a iniciar sesión desde el momento en que se
-- desactiva, pero una sesión/JWT ya emitido sigue siendo válido hasta que
-- expire o el usuario vuelva a loguearse — no hay revocación en vivo, ni la
-- necesita (evita agregar Admin API de Supabase / SUPABASE_SERVICE_ROLE_KEY,
-- infraestructura que hoy no existe en este backend).
ALTER TABLE "public"."users"
  ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;

-- CREATE OR REPLACE de la MISMA función de
-- 20260830120000_custom_access_token_hook — no se toca ningún GRANT/REVOKE
-- de esa migración (siguen vigentes), esto solo cambia el cuerpo de la
-- función para agregar el claim `activo` junto al `rol` ya existente.
CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  rol_actual "public"."rol_usuario";
  activo_actual boolean;
BEGIN
  SELECT "rol", "activo" INTO rol_actual, activo_actual
  FROM "public"."users"
  WHERE "id" = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  -- Sin fila en public.users (cuentas de servicio agente-1/agente-2): no
  -- tocar app_metadata, mismo criterio que la versión anterior de esta
  -- función.
  IF rol_actual IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{app_metadata}',
      COALESCE(claims -> 'app_metadata', '{}'::jsonb)
    );
    claims := jsonb_set(
      claims,
      '{app_metadata,rol}',
      to_jsonb(rol_actual::text)
    );
    claims := jsonb_set(
      claims,
      '{app_metadata,activo}',
      to_jsonb(activo_actual)
    );
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- El hook ya está activado en el dashboard de Supabase desde la migración
-- 20260830120000 (Authentication → Auth Hooks) — CREATE OR REPLACE no
-- requiere volver a activarlo, sigue apuntando a la misma función.
