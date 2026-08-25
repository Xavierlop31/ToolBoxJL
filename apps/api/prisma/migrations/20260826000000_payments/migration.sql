-- ToolBox JL — migración de pagos (Sprint 3, HU-2.2/2.3/2.4 — RF-2.2 a RF-2.4).
--
-- *** ESTA MIGRACIÓN NO FUE EJECUTADA CONTRA UNA BASE REAL ***
-- Escrita a mano porque este entorno de desarrollo no tiene una conexión a una
-- instancia de Supabase viva. Es responsabilidad de quien tenga las credenciales
-- aplicar este SQL contra la base real.

-- ============================================================================
-- Enums
-- ============================================================================
CREATE TYPE "tipo_pago" AS ENUM (
  'pago_alquiler',
  'pago_venta',
  'deposito_garantia',
  'cobro_mora'
);

CREATE TYPE "metodo_pago" AS ENUM ('pse', 'tarjeta', 'contra_entrega');

CREATE TYPE "estado_pago" AS ENUM (
  'pendiente',
  'hold',
  'capturado',
  'reembolsado',
  'fallido'
);

-- ============================================================================
-- Tabla: payments
-- ============================================================================
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "tipo" "tipo_pago" NOT NULL,
    "metodo" "metodo_pago" NOT NULL,
    "estado" "estado_pago" NOT NULL DEFAULT 'pendiente',
    "monto" INTEGER NOT NULL,
    "wompi_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Row-Level Security (docs/DESIGN.md §4.2)
-- ============================================================================
ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;

-- Clientes pueden ver los pagos de sus propias órdenes
CREATE POLICY "Users can view payments of own orders"
ON "public"."payments"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = payments.order_id
    AND orders.cliente_id = auth.uid()
  )
);

-- El staff operativo puede ver todos los pagos
CREATE POLICY "Staff can view all payments"
ON "public"."payments"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.rol IN ('admin', 'gerente', 'almacenista', 'repartidor')
  )
);

-- No se define política de INSERT/UPDATE para el rol "authenticated": los
-- pagos se crean y actualizan exclusivamente desde la API (PaymentsModule),
-- igual que el resto de las escrituras transaccionales de la plataforma
-- (ver nota general de RLS en docs/DESIGN.md §4.2).
