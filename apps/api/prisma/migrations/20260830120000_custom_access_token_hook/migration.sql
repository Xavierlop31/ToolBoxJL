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
-- *** SECURITY DEFINER, NO INVOKER — CAMBIO DE DIAGNÓSTICO EN VIVO
-- 2026-08-28 ***: la primera versión de esta función usaba SECURITY INVOKER
-- (default) con `GRANT SELECT ON public.users TO supabase_auth_admin`
-- explícito, asumiendo que ese grant alcanzaba. En producción NO alcanzó:
-- se verificó con `has_table_privilege('supabase_auth_admin', 'public.users',
-- 'SELECT')` → `true`, sin RLS habilitada en `public.users`, y aun así el
-- `SELECT ... WHERE id = (event->>'user_id')::uuid` devolvía cero filas
-- cuando Supabase invocaba el hook de verdad (confirmado con un debug claim
-- que hardcodeaba el UUID literal, salteando la extracción del `event` —
-- mismo resultado). La causa exacta de por qué el grant de tabla no se
-- traducía en visibilidad de filas para `supabase_auth_admin` en runtime
-- del hook quedó sin identificar — puede ser una particularidad de cómo
-- Supabase gestiona ese rol interno. SECURITY DEFINER lo resuelve de raíz:
-- la función corre con los privilegios de quien la creó (dueño de
-- `public.users`), no con los de `supabase_auth_admin`, mismo patrón que
-- `is_staff()` y `handle_new_user()` en este mismo repo. Confirmado con un
-- login real: `app_metadata.rol` llegó correcto recién con este cambio.
-- `search_path = ''` es obligatorio con SECURITY DEFINER (no opcional, ver
-- la nota de 20260823235900_supabase_users_bootstrap sobre secuestro de
-- search_path) — todas las referencias ya están calificadas
-- (`public.users`, `public.rol_usuario`).
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
-- invocar Auth Hooks — sin USAGE+EXECUTE explícitos, el hook falla con
-- "permission denied" en CADA login y Supabase trata ese fallo como un
-- fallo total de autenticación, no solo del claim. NO hace falta
-- `GRANT SELECT ON public.users` acá: con SECURITY DEFINER la función ya no
-- corre con los privilegios de `supabase_auth_admin`, así que ese grant
-- (que la primera versión sí tenía) quedó innecesario.
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";
GRANT EXECUTE ON FUNCTION "public"."custom_access_token_hook"(jsonb) TO "supabase_auth_admin";
REVOKE EXECUTE ON FUNCTION "public"."custom_access_token_hook"(jsonb) FROM "authenticated", "anon", "public";

-- Esta migración SOLO crea la función — activar el hook en sí es una acción
-- exclusiva del dashboard de Supabase (Authentication → Auth Hooks →
-- "Add hook" → Postgres function → elegir `public.custom_access_token_hook`
-- → Enable), sin equivalente por SQL/API. Ya se hizo y se verificó
-- end-to-end en producción el 2026-08-28 (login real, JWT decodificado con
-- `app_metadata.rol` presente) — si una futura migración recrea el hook
-- desde cero en otro entorno (staging, otro proyecto de Supabase), ese paso
-- de dashboard sigue siendo manual.
