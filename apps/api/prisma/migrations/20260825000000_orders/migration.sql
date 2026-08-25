-- ToolBox JL — migración de órdenes (Sprint 2, HU-2.1 y HU-2.2).
--
-- *** ESTA MIGRACIÓN NO FUE EJECUTADA CONTRA UNA BASE REAL ***
-- Escrita a mano porque este entorno de desarrollo no tiene una conexión a una
-- instancia de Supabase viva. Es responsabilidad de quien tenga las credenciales
-- aplicar este SQL contra la base real.

-- ============================================================================
-- Enums
-- ============================================================================
CREATE TYPE "tipo_orden" AS ENUM ('alquiler', 'venta');

CREATE TYPE "estado_orden" AS ENUM (
  'pendiente_pago',
  'confirmada',
  'en_curso',
  'devuelta',
  'cerrada',
  'cancelada'
);

CREATE TYPE "modo_retorno" AS ENUM ('en_sede', 'recogida_domicilio');

-- ============================================================================
-- Tabla: orders
-- ============================================================================
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cliente_id" UUID NOT NULL,
    "tipo" "tipo_orden" NOT NULL,
    "estado" "estado_orden" NOT NULL DEFAULT 'pendiente_pago',
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "return_mode" "modo_retorno" NOT NULL,
    "direccion_entrega" TEXT NOT NULL,
    "zona_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "orders_cliente_id_idx" ON "orders"("cliente_id");

-- ============================================================================
-- Tabla: order_items
-- ============================================================================
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "unidad_id" UUID NOT NULL,
    "tarifa_aplicada" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");
CREATE INDEX "order_items_unidad_id_idx" ON "order_items"("unidad_id");

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_unidad_id_fkey"
    FOREIGN KEY ("unidad_id") REFERENCES "tool_units"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Row-Level Security (docs/DESIGN.md §4.2)
-- ============================================================================
ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;

-- Clientes pueden ver solo sus propias órdenes
CREATE POLICY "Users can view own orders"
ON "public"."orders"
FOR SELECT
USING (auth.uid() = cliente_id);

-- El staff operativo puede ver todas las órdenes
CREATE POLICY "Staff can view all orders"
ON "public"."orders"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.rol IN ('admin', 'gerente', 'almacenista', 'repartidor')
  )
);

-- Clientes pueden crear sus propias órdenes
CREATE POLICY "Users can insert own orders"
ON "public"."orders"
FOR INSERT
WITH CHECK (auth.uid() = cliente_id);
