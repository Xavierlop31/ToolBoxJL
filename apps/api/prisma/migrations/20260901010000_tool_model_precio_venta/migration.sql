-- ToolBox JL — agrega precio_venta a tool_models (Sprint 12, HU-12.2).
--
-- *** ESTA MIGRACIÓN NO FUE EJECUTADA CONTRA UNA BASE REAL ***
-- Escrita a mano porque este entorno de desarrollo no tiene una conexión a una
-- instancia de Supabase viva. Es responsabilidad de quien tenga las credenciales
-- aplicar este SQL contra la base real.

ALTER TABLE "tool_models" ADD COLUMN "precio_venta" INTEGER;
