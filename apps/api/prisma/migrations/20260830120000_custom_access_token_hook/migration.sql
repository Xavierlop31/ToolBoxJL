-- ToolBox JL — Custom Access Token Hook: copia public.users.rol al claim
-- app_metadata.rol del JWT que emite Supabase Auth en cada login/refresh.
--
-- *** GAP DE CONFIGURACIÓN, DETECTADO EN TESTING REAL 2026-08-28 *** —
-- VerificarAccesoUseCase (apps/api/src/modules/auth/application/) siempre
-- asumió que este hook ya estaba configurado en el dashboard de Supabase
-- (Authentication → Auth Hooks → "Customize Access Token (Claims) Hook",
-- docs/DESIGN.md §3 punto 7), pero nunca se creó — la sección "Auth Hooks"
-- del dashboard está vacía. Consecuencia real: TODO usuario humano (rol
-- admin/gerente/almacenista/repartidor/cliente) llega con `app_metadata.rol`
-- ausente en su JWT, y SupabaseAuthGuard rechaza cualquier request
-- autenticado (antes con un 500 sin manejar; ver la migración de código
-- "fix(api): mapea TokenInvalidoError a 401" — ahora 401, pero el gap de
-- fondo seguía sin resolverse). Las 2 cuentas de servicio de los Agentes de
-- IA (agente-1/agente-2) no se ven afectadas porque a esas se les setea
-- `app_metadata.rol` directo por Admin API al crearlas — nunca dependieron
-- de este hook, por eso el gap pasó desapercibido en
-- .github/workflows/verify-agentes-jwt-rol.yml (que solo verificó esas 2
-- cuentas).
--
-- Contrato exacto que exige Supabase para un Auth Hook de tipo "Postgres
-- function" (https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook):
-- recibe y devuelve el `event` COMPLETO (no solo `claims`), como `jsonb`.
--
-- SECURITY INVOKER (default, sin SECURITY DEFINER): corre con los
-- privilegios del rol que la invoca (`supabase_auth_admin`, el único rol
-- que Supabase usa para llamar hooks), al que se le da acceso explícito y
-- mínimo más abajo — sin necesidad del patrón SECURITY DEFINER +
-- search_path vacío que sí usa `handle_new_user` en
-- 20260823235900_supabase_users_bootstrap (ese SÍ corre como el dueño de la
-- función, con más privilegio del que tiene quien la invoca). Igual se fija
-- `search_path = ''` acá como defensa adicional: todas las referencias ya
-- están calificadas (`public.users`, `public.rol_usuario`), así que no hay
-- costo funcional y elimina cualquier ambigüedad de resolución de schema.
CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  rol_actual "public"."rol_usuario";
BEGIN
  SELECT "rol" INTO rol_actual
  FROM "public"."users"
  WHERE "id" = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  -- Sin fila en public.users (caso de las cuentas de servicio agente-1/
  -- agente-2, que no son un rol_usuario válido): no tocar app_metadata,
  -- para no pisar el rol que ya les seteó Admin API al crearlas.
  IF rol_actual IS NOT NULL THEN
    -- jsonb_set solo crea el ÚLTIMO nivel del path si falta (no los
    -- intermedios) — nos aseguramos de que 'app_metadata' exista como
    -- objeto antes de escribir 'rol' adentro, en vez de asumir que
    -- Supabase siempre lo manda poblado.
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
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- supabase_auth_admin es el único rol que Supabase usa internamente para
-- invocar Auth Hooks — sin estos grants explícitos, el hook falla con
-- "permission denied" en CADA login (no en esta migración, que corre como
-- owner) y Supabase trata ese fallo como un fallo total de autenticación,
-- no solo del claim.
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";
GRANT EXECUTE ON FUNCTION "public"."custom_access_token_hook"(jsonb) TO "supabase_auth_admin";
REVOKE EXECUTE ON FUNCTION "public"."custom_access_token_hook"(jsonb) FROM "authenticated", "anon", "public";
GRANT SELECT ON "public"."users" TO "supabase_auth_admin";

-- *** ESTA MIGRACIÓN SOLO CREA LA FUNCIÓN — NO ACTIVA EL HOOK ***. Activarlo
-- es una acción exclusiva del dashboard de Supabase (Authentication → Auth
-- Hooks → "Add hook" → Postgres function → elegir
-- `public.custom_access_token_hook` → Enable) — no hay API/SQL para hacerlo
-- desde acá. Confirmar con el Arquitecto una vez aplicada esta migración.
