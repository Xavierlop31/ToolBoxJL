-- ToolBox JL — bootstrap de public.users (companion table de Supabase Auth).
--
-- *** GAP DE MIGRACIÓN, DETECTADO AL DESPLEGAR CONTRA SUPABASE REAL POR
-- PRIMERA VEZ *** — `prisma migrate deploy` falló con P3018/42P01 al aplicar
-- `20260824000000_init_catalog_inventory`: sus funciones RLS (`is_staff()`
-- y las siguientes) hacen `SELECT 1 FROM public.users WHERE users.id =
-- auth.uid() ...`, pero ninguna de las 6 migraciones existentes crea esa
-- tabla. No es un olvido de una sola migración — el modelo tampoco existe en
-- schema.prisma, a propósito: AuthModule verifica JWTs de Supabase Auth
-- directo contra el JWKS del proyecto (ver
-- modules/auth/infrastructure/config/supabase-auth.config.ts), nunca
-- consulta `users` vía Prisma/ORM. `public.users` solo la leen las funciones
-- RLS de Postgres (SQL crudo), así que nunca hubo un `model User` en
-- schema.prisma que hiciera evidente que la tabla faltaba — quedó como un
-- hueco entre "lo que verifica el código Node" y "lo que asume el SQL".
--
-- Carpeta con timestamp ANTERIOR a 20260824000000 a propósito: esta tabla
-- tiene que existir ANTES de que corra la migración que la referencia.
-- `prisma migrate deploy` aplica las migraciones pendientes en orden de
-- nombre de carpeta, no en orden de creación en disco — insertar una con
-- timestamp más temprano alcanza para que se aplique primero, sin tocar el
-- archivo ya escrito por Backend Developer (ver la nota de cabecera de
-- 20260824000000_init_catalog_inventory/migration.sql sobre autoría).
--
-- Fuente: docs/DESIGN.md §4.1 (entidad USERS del ER diagram) y §4.2 (las
-- políticas RLS ya escritas ahí ya asumen esta tabla — "CREATE POLICY ...
-- SELECT 1 FROM public.users WHERE users.id = auth.uid()"). Columnas y tipos
-- tomados literal de ahí; el enum de `rol` usa los 5 roles HUMANOS de
-- packages/shared-types/src/rol.ts (`ROLES_HUMANOS`) — NO incluye
-- "agente-1"/"agente-2"/"agente-3": los Agentes de IA autentican con un JWT
-- de servicio propio (AgentsModule, Sprint 7+), nunca son una fila en esta
-- tabla.
--
-- Patrón: mirror de auth.users + trigger de sincronización al signup, según
-- la guía oficial de Supabase
-- (https://supabase.com/docs/guides/auth/managing-user-data). El
-- `security definer set search_path = ''` en la función del trigger no es
-- opcional — sin `search_path` fijo, una función SECURITY DEFINER es
-- vulnerable a que alguien con permiso de CREATE en algún schema del search
-- path del rol que la ejecuta le "secuestre" una llamada no calificada
-- (ej. redefiniendo `now()` o `public.users` en otro schema); con
-- search_path vacío, cada referencia de este archivo está calificada
-- explícitamente (`public.users`, `auth.users`) y no hay tabla implícita que
-- sustituir.

-- ============================================================================
-- Tabla: public.users (RF genérico — todo Order/Payment/etc referencia
-- users.id; ver docs/DESIGN.md §4.1)
-- ============================================================================
CREATE TYPE "rol_usuario" AS ENUM (
  'admin',
  'gerente',
  'almacenista',
  'repartidor',
  'cliente'
);

CREATE TABLE "public"."users" (
    "id" UUID NOT NULL REFERENCES "auth"."users" ("id") ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "telefono" TEXT,
    -- Todo signup nuevo entra como 'cliente' (ver trigger más abajo) — la
    -- promoción a un rol de staff (admin/gerente/almacenista/repartidor) es
    -- una operación administrativa posterior, fuera del alcance de este
    -- trigger de signup.
    "rol" "rol_usuario" NOT NULL DEFAULT 'cliente',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- Trigger: sincroniza cada alta en auth.users (Supabase Auth: email/password
-- o Google OAuth, docs/DESIGN.md §3 punto 7) con una fila espejo en
-- public.users, para que auth.uid() tenga siempre una fila que las políticas
-- RLS de las demás migraciones puedan encontrar.
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."handle_new_user"()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO "public"."users" ("id", "email", "full_name")
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER "on_auth_user_created"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE PROCEDURE "public"."handle_new_user"();
