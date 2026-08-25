-- ToolBox JL — migración de InspectionModule (Sprint 5, Issues #14-#16,
-- HU-5.1 a 5.3 — RF-4.1 a RF-4.3).
--
-- *** ESTA MIGRACIÓN NO FUE EJECUTADA CONTRA UNA BASE REAL ***
-- Escrita a mano porque este entorno de desarrollo no tiene una conexión a una
-- instancia de Supabase viva. Es responsabilidad de quien tenga las credenciales
-- aplicar este SQL contra la base real (mismo criterio que las migraciones de
-- los sprints anteriores).
--
-- MoraCalculatorJob (HU-5.3, RF-4.3) NO agrega tablas nuevas: reusa
-- "payments" (tipo "cobro_mora", ya declarado en el enum tipo_pago desde la
-- migración de Sprint 3) — ver apps/workers/src/main.ts.

-- ============================================================================
-- Enums
-- ============================================================================
CREATE TYPE "tipo_inspeccion" AS ENUM ('salida', 'recepcion');

-- ============================================================================
-- Tabla: inspection_checklists
-- ============================================================================
CREATE TABLE "inspection_checklists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unidad_id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "tipo" "tipo_inspeccion" NOT NULL,
    "hallazgos" JSONB NOT NULL DEFAULT '[]',
    "fotos_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "garantia_ejecutada" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_checklists_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inspection_checklists_unidad_id_idx" ON "inspection_checklists"("unidad_id");
CREATE INDEX "inspection_checklists_shipment_id_idx" ON "inspection_checklists"("shipment_id");

ALTER TABLE "inspection_checklists" ADD CONSTRAINT "inspection_checklists_unidad_id_fkey"
    FOREIGN KEY ("unidad_id") REFERENCES "tool_units"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inspection_checklists" ADD CONSTRAINT "inspection_checklists_shipment_id_fkey"
    FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Row-Level Security (docs/DESIGN.md §4.2)
-- ============================================================================
-- "inspection_checklists" es append-only (mismo criterio que
-- "tool_unit_status_log"): staff ve todo, sin política de UPDATE/DELETE.
ALTER TABLE "public"."inspection_checklists" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all inspection checklists"
ON "public"."inspection_checklists"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.rol IN ('admin', 'gerente', 'almacenista', 'repartidor')
  )
);

CREATE POLICY "Staff can insert inspection checklists"
ON "public"."inspection_checklists"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.rol IN ('admin', 'almacenista', 'repartidor')
  )
);

-- El cliente puede ver el checklist de la devolución de SU propia orden
-- (join vía shipments -> orders, mismo criterio que la policy de
-- "shipments" del Sprint 4).
CREATE POLICY "Users can view inspections of own orders"
ON "public"."inspection_checklists"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shipments
    JOIN public.orders ON orders.id = shipments.order_id
    WHERE shipments.id = inspection_checklists.shipment_id
    AND orders.cliente_id = auth.uid()
  )
);

-- No se define política de UPDATE/DELETE para ningún rol: fila inmutable
-- una vez insertada (mismo criterio que docs/DESIGN.md §4.2 para
-- "tool_unit_status_log"/"inspection_checklists").
