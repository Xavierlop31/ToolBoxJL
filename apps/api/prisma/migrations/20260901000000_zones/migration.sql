-- ToolBox JL — migración de zonas logísticas por ciudad (Sprint 12, HU-12.2).
--
-- *** ESTA MIGRACIÓN NO FUE EJECUTADA CONTRA UNA BASE REAL ***
-- Escrita a mano porque este entorno de desarrollo no tiene una conexión a una
-- instancia de Supabase viva. Es responsabilidad de quien tenga las credenciales
-- aplicar este SQL contra la base real.

-- ============================================================================
-- Tabla: zones
-- ============================================================================
CREATE TABLE "zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "zones_ciudad_idx" ON "zones"("ciudad");

-- ============================================================================
-- Seed: 15 zonas exactas pedidas por
-- features/12_catalogo_avanzado_carrito.feature, escenario "Filtrado
-- dinámico de zonas logísticas por ciudad seleccionada" (HU-12.2).
-- ============================================================================
INSERT INTO "zones" ("nombre", "ciudad") VALUES
    ('Poblado', 'Medellín'),
    ('Laureles', 'Medellín'),
    ('Belén', 'Medellín'),
    ('Envigado', 'Medellín'),
    ('Bello', 'Medellín'),
    ('Itagüí', 'Medellín'),
    ('Centro', 'Medellín'),
    ('Chapinero', 'Bogotá'),
    ('Usaquén', 'Bogotá'),
    ('Suba', 'Bogotá'),
    ('Engativá', 'Bogotá'),
    ('Fontibón', 'Bogotá'),
    ('Calle 80', 'Bogotá'),
    ('Zona Industrial', 'Bogotá'),
    ('Centro', 'Bogotá');

-- Sin Row-Level Security: tabla de catálogo público de solo lectura,
-- consultada exclusivamente a través del backend (GET /zones, sin guard —
-- ver ZonesModule), no directamente por un cliente Supabase con anon key —
-- mismo criterio que "tool_models"/"tool_units", que tampoco declaran RLS
-- en su migración de Sprint 1.
