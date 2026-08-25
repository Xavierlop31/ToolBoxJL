-- ToolBox JL — migración de flota y logística (Sprint 4, Issues #11-#13,
-- HU-4.1 a 4.3 — RF-3.1 a RF-3.3).
--
-- *** ESTA MIGRACIÓN NO FUE EJECUTADA CONTRA UNA BASE REAL ***
-- Escrita a mano porque este entorno de desarrollo no tiene una conexión a una
-- instancia de Supabase viva. Es responsabilidad de quien tenga las credenciales
-- aplicar este SQL contra la base real (mismo criterio que las migraciones de
-- los sprints anteriores).

-- ============================================================================
-- Enums
-- ============================================================================
CREATE TYPE "tipo_vehiculo" AS ENUM ('moto', 'camioneta', 'camion');

CREATE TYPE "tipo_envio" AS ENUM ('entrega', 'recogida');

CREATE TYPE "estado_envio" AS ENUM (
  'pendiente_asignacion',
  'en_ruta_entrega',
  'entregado',
  'en_ruta_recogida',
  'retornado'
);

CREATE TYPE "generada_por" AS ENUM ('agente_1', 'manual');

-- ============================================================================
-- Tabla: vehicles
-- ============================================================================
-- Nota: `zonas` no está listado en el ER diagram de docs/DESIGN.md §4.1 para
-- VEHICLES, pero sí en openapi.yaml (`Vehicle.zonas: uuid[]`), que es la
-- fuente de autoridad #1 (CLAUDE.md §1) para el contrato de API — se incluye
-- acá como `uuid[]` (no como texto plano, a diferencia de `fotos_urls` en
-- otras tablas, porque acá sí son uuid de zonas reales, no URLs).
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tipo" "tipo_vehiculo" NOT NULL,
    "capacidad_kg" DOUBLE PRECISION NOT NULL,
    "capacidad_m3" DOUBLE PRECISION NOT NULL,
    "zonas" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    "repartidor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- Tabla: shipments
-- ============================================================================
CREATE TABLE "shipments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "vehiculo_id" UUID,
    "tipo" "tipo_envio" NOT NULL,
    "estado_envio" "estado_envio" NOT NULL DEFAULT 'pendiente_asignacion',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- Relación 1:1 ORDERS ||--|| SHIPMENTS (docs/DESIGN.md §4.1).
CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");
CREATE INDEX "shipments_vehiculo_id_idx" ON "shipments"("vehiculo_id");
CREATE INDEX "shipments_estado_envio_idx" ON "shipments"("estado_envio");

ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shipments" ADD CONSTRAINT "shipments_vehiculo_id_fkey"
    FOREIGN KEY ("vehiculo_id") REFERENCES "vehicles"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Tabla: routes
-- ============================================================================
-- `paradas` es jsonb (array de shipment_id en orden de secuencia), no una
-- relación normalizada — decisión del Tech Lead, Sprint 4 (mismo criterio
-- que docs/DESIGN.md §4.1: `jsonb paradas`).
CREATE TABLE "routes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vehiculo_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "paradas" JSONB NOT NULL DEFAULT '[]',
    "generada_por" "generada_por" NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "routes_vehiculo_id_idx" ON "routes"("vehiculo_id");

ALTER TABLE "routes" ADD CONSTRAINT "routes_vehiculo_id_fkey"
    FOREIGN KEY ("vehiculo_id") REFERENCES "vehicles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Row-Level Security (docs/DESIGN.md §4.2)
-- ============================================================================
ALTER TABLE "public"."vehicles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."shipments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."routes" ENABLE ROW LEVEL SECURITY;

-- vehicles / routes: sin política de cliente (no aplica — un cliente nunca
-- necesita ver la flota ni las rutas directamente, mismo criterio que el
-- prompt del Tech Lead). Solo el staff operativo puede ver estas tablas.
CREATE POLICY "Staff can view all vehicles"
ON "public"."vehicles"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.rol IN ('admin', 'gerente', 'almacenista', 'repartidor')
  )
);

CREATE POLICY "Staff can view all routes"
ON "public"."routes"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.rol IN ('admin', 'gerente', 'almacenista', 'repartidor')
  )
);

-- shipments: el staff ve todos; el cliente ve el envío de SU propia orden
-- (mismo criterio de join que la policy de "payments" del Sprint 3).
CREATE POLICY "Staff can view all shipments"
ON "public"."shipments"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.rol IN ('admin', 'gerente', 'almacenista', 'repartidor')
  )
);

CREATE POLICY "Users can view shipment of own orders"
ON "public"."shipments"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = shipments.order_id
    AND orders.cliente_id = auth.uid()
  )
);

-- No se define política de INSERT/UPDATE para el rol "authenticated": estas
-- tablas se crean y actualizan exclusivamente desde la API (FleetModule/
-- LogisticsModule/PaymentsModule), igual que el resto de las escrituras
-- transaccionales de la plataforma (ver nota general de RLS en
-- docs/DESIGN.md §4.2).

-- ============================================================================
-- Supabase Realtime (RF-3.3, HU-4.2)
-- ============================================================================
-- *** TAMPOCO EJECUTADO CONTRA UNA BASE REAL — ver nota al inicio del archivo ***
-- Necesario para que el panel de seguimiento del Gerente (frontend, GET
-- /logistics/shipments para el snapshot inicial) reciba las actualizaciones
-- en vivo suscribiéndose directo a Supabase Realtime sobre esta tabla, sin
-- polling (openapi.yaml, descripción de GET /logistics/shipments).
ALTER PUBLICATION supabase_realtime ADD TABLE shipments;
