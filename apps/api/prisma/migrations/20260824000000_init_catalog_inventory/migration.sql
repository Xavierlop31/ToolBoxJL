-- ToolBox JL — migración inicial de CatalogModule/InventoryModule (Sprint 1,
-- Issues #1-#4 / HU-1.1 a 1.4).
--
-- *** ESTA MIGRACIÓN NO FUE EJECUTADA CONTRA UNA BASE REAL ***
-- Escrita a mano (mismo formato que emite `prisma migrate dev`) porque este
-- entorno de desarrollo no tiene una conexión a una instancia de Supabase
-- (sin DATABASE_URL de una base viva). Es responsabilidad de quien tenga las
-- credenciales del proyecto Supabase (Tech Lead / DevOps) revisar y aplicar
-- este SQL (vía `prisma migrate deploy` o ejecutándolo directo en el SQL
-- editor de Supabase) contra la base real antes de que estos endpoints
-- puedan funcionar en un entorno desplegado.
--
-- Fuente: docs/DESIGN.md §4.1 (ER diagram) y §4.2 (patrón de políticas RLS,
-- replicado acá para tool_models/tool_units/tool_unit_status_log).

-- ============================================================================
-- Enum: estado_unidad (RF-1.3)
-- ============================================================================
CREATE TYPE "estado_unidad" AS ENUM (
  'Nuevo',
  'Excelente',
  'Operativo',
  'En Mantenimiento',
  'Dado de Baja'
);

-- ============================================================================
-- Tabla: tool_models (RF-1.1)
-- ============================================================================
CREATE TABLE "tool_models" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "potencia_w" DOUBLE PRECISION,
    "peso_kg" DOUBLE PRECISION,
    "volumen_m3" DOUBLE PRECISION,
    "tarifa_dia" INTEGER NOT NULL,
    "tarifa_semana" INTEGER,
    "costo_compra" INTEGER,
    "deposito_pct" DOUBLE PRECISION,
    "interes_mora_dia" DOUBLE PRECISION,
    "manual_pdf_url" TEXT,
    "disponible_para_venta" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tool_models_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- Tabla: tool_units (RF-1.2)
-- ============================================================================
CREATE TABLE "tool_units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "modelo_id" UUID NOT NULL,
    "numero_serie" TEXT NOT NULL,
    "estado" "estado_unidad" NOT NULL DEFAULT 'Nuevo',
    "fecha_ingreso" DATE NOT NULL DEFAULT CURRENT_DATE,

    CONSTRAINT "tool_units_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tool_units_numero_serie_key" ON "tool_units"("numero_serie");
CREATE INDEX "tool_units_modelo_id_idx" ON "tool_units"("modelo_id");

ALTER TABLE "tool_units" ADD CONSTRAINT "tool_units_modelo_id_fkey"
    FOREIGN KEY ("modelo_id") REFERENCES "tool_models"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Tabla: tool_unit_status_log (RF-1.3) — append-only
-- ============================================================================
CREATE TABLE "tool_unit_status_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unidad_id" UUID NOT NULL,
    "estado_anterior" "estado_unidad",
    "estado_nuevo" "estado_unidad" NOT NULL,
    "fotos_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    -- FK lógica a public.users.id (Supabase Auth / AuthModule, Sprint 0).
    -- Sin FK física declarada: la tabla `users` está fuera del alcance de
    -- esta migración (ver cabecera de schema.prisma).
    "autor_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_unit_status_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tool_unit_status_log_unidad_id_idx" ON "tool_unit_status_log"("unidad_id");

ALTER TABLE "tool_unit_status_log" ADD CONSTRAINT "tool_unit_status_log_unidad_id_fkey"
    FOREIGN KEY ("unidad_id") REFERENCES "tool_units"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Row-Level Security (docs/DESIGN.md §4.2 — mismo patrón que el ejemplo de
-- orders/tool_unit_status_log, replicado para las 3 tablas de esta migración)
-- ============================================================================

-- ---- tool_models ------------------------------------------------------
-- El catálogo es público: cualquiera (incluido un visitante anónimo) puede
-- leer los modelos. El staff queda cubierto por esa misma política (no hace
-- falta una política adicional de solo-staff para SELECT), pero se agrega
-- explícita igual, como superset redundante-a-propósito, para mantener
-- simetría con el patrón de "Staff can view all X" del ejemplo dado y dejar
-- el camino listo si el acceso público se restringe más adelante.
ALTER TABLE "public"."tool_models" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tool models"
ON "public"."tool_models"
FOR SELECT
USING (true);

CREATE POLICY "Staff can view all tool models"
ON "public"."tool_models"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.rol IN ('admin', 'gerente', 'almacenista', 'repartidor')
  )
);

-- Solo admin puede registrar nuevos modelos (RF-1.1, POST /inventory/models).
CREATE POLICY "Only admin can insert tool models"
ON "public"."tool_models"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.rol = 'admin'
  )
);

-- ---- tool_units ---------------------------------------------------------
-- Igual criterio que tool_models: catálogo/disponibilidad de unidades es
-- público (RF-1.4, GET /inventory/check-availability lo consume vía la API,
-- pero la lectura directa por RLS también queda abierta por consistencia).
ALTER TABLE "public"."tool_units" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tool units"
ON "public"."tool_units"
FOR SELECT
USING (true);

CREATE POLICY "Staff can view all tool units"
ON "public"."tool_units"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.rol IN ('admin', 'gerente', 'almacenista', 'repartidor')
  )
);

-- Solo almacenista/admin pueden dar de alta unidades físicas
-- (RF-1.2, POST /inventory/units).
CREATE POLICY "Almacenista and admin can insert tool units"
ON "public"."tool_units"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.rol IN ('almacenista', 'admin')
  )
);

-- ---- tool_unit_status_log ------------------------------------------------
-- Hoja de vida / auditoría: a diferencia de tool_models/tool_units, NO es de
-- lectura pública (contiene autor_id y evidencia interna) — solo el staff
-- operativo puede leerla. Mismo patrón exacto que el ejemplo ya existente en
-- docs/DESIGN.md §4.2 (tabla append-only: sin política de UPDATE/DELETE).
ALTER TABLE "public"."tool_unit_status_log" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view status log entries"
ON "public"."tool_unit_status_log"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.rol IN ('admin', 'gerente', 'almacenista', 'repartidor')
  )
);

CREATE POLICY "Staff can insert status log entries"
ON "public"."tool_unit_status_log"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.rol IN ('admin', 'almacenista', 'repartidor')
  )
);
-- No UPDATE/DELETE policy is defined: rows are immutable once inserted.
