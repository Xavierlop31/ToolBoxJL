-- ToolBox JL — Sprint 14 (Fase 3, Épica 13 — Inventario QR, Issues #147-#150).
--
-- *** ESTA MIGRACIÓN NO FUE EJECUTADA CONTRA UNA BASE REAL *** — mismo
-- disclaimer que el resto de las migraciones de este repo (ver cabecera de
-- schema.prisma): escrita a mano, nunca corrida contra un Postgres real.
--
-- No incluye DDL para `public.users`: esa tabla ya existe (migración
-- 20260823235900_supabase_users_bootstrap) — el `model User` nuevo de
-- schema.prisma es un mirror de SOLO LECTURA sobre columnas que ya existen,
-- ver el comentario de esa sección en schema.prisma.

-- ============================================================================
-- tool_units — HU-13.2 (3 campos nuevos, nullable en columna aunque
-- POST /inventory/units los exige a nivel de DTO).
-- ============================================================================
ALTER TABLE "tool_units" ADD COLUMN "fecha_adquisicion" DATE;
ALTER TABLE "tool_units" ADD COLUMN "costo_compra" INTEGER;
ALTER TABLE "tool_units" ADD COLUMN "ubicacion_bodega" TEXT;

-- ============================================================================
-- tool_unit_status_log — HU-13.3 (hoja de vida de taller/baja).
-- ============================================================================
CREATE TYPE "tipo_mantenimiento" AS ENUM ('Preventivo', 'Correctivo');

ALTER TABLE "tool_unit_status_log" ADD COLUMN "tipo_mantenimiento" "tipo_mantenimiento";
ALTER TABLE "tool_unit_status_log" ADD COLUMN "falla_reportada" TEXT;
ALTER TABLE "tool_unit_status_log" ADD COLUMN "tecnico_asignado" TEXT;
ALTER TABLE "tool_unit_status_log" ADD COLUMN "costo_estimado" INTEGER;
ALTER TABLE "tool_unit_status_log" ADD COLUMN "fecha_prevista_fin" DATE;
ALTER TABLE "tool_unit_status_log" ADD COLUMN "motivo_baja" TEXT;

-- ============================================================================
-- vehicles — HU-13.4 (placa, solo lectura en este sprint — ver
-- packages/shared-types/src/vehicle.ts, doc-comment de Vehicle.placa).
-- ============================================================================
ALTER TABLE "vehicles" ADD COLUMN "placa" TEXT;
