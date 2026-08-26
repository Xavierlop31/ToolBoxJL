-- ToolBox JL — migración de carrito de compras (Sprint 9, Issues #26/#27, HU-10.1/10.2).
--
-- *** ESTA MIGRACIÓN NO FUE EJECUTADA CONTRA UNA BASE REAL ***
-- Escrita a mano porque este entorno de desarrollo no tiene una conexión a una
-- instancia de Supabase viva. Es responsabilidad de quien tenga las credenciales
-- aplicar este SQL contra la base real.

-- ============================================================================
-- Tabla: carts
-- ============================================================================
CREATE TABLE "carts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cliente_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "carts_cliente_id_key" ON "carts"("cliente_id");

-- ============================================================================
-- Tabla: cart_items
-- ============================================================================
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cart_id" UUID NOT NULL,
    "modelo_id" UUID NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "dias" INTEGER,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cart_items_cart_id_modelo_id_key" ON "cart_items"("cart_id", "modelo_id");
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items"("cart_id");

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey"
    FOREIGN KEY ("cart_id") REFERENCES "carts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_modelo_id_fkey"
    FOREIGN KEY ("modelo_id") REFERENCES "tool_models"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Row-Level Security (docs/DESIGN.md §4.2, mismo criterio que "orders")
-- ============================================================================
ALTER TABLE "public"."carts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;

-- Un cliente puede ver/crear/actualizar solo su propio carrito. No hay
-- política de DELETE a propósito: no hay endpoint de "vaciar carrito" en
-- este sprint (fuera de alcance, ver comentario de cabecera de
-- apps/api/src/modules/cart/domain/cart.repository.ts) — todas las
-- escrituras pasan por la API (CartModule), que ya valida el `cliente_id`
-- contra el JWT antes de llegar acá.
CREATE POLICY "Users can view own cart"
ON "public"."carts"
FOR SELECT
USING (auth.uid() = cliente_id);

CREATE POLICY "Users can insert own cart"
ON "public"."carts"
FOR INSERT
WITH CHECK (auth.uid() = cliente_id);

CREATE POLICY "Users can update own cart"
ON "public"."carts"
FOR UPDATE
USING (auth.uid() = cliente_id);

-- Las líneas de carrito heredan la visibilidad del carrito dueño (no tienen
-- `cliente_id` propio — mismo criterio que `order_items` respecto de
-- `orders`, que tampoco declara políticas propias en su migración).
CREATE POLICY "Users can view own cart items"
ON "public"."cart_items"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.carts
    WHERE carts.id = cart_items.cart_id
    AND carts.cliente_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own cart items"
ON "public"."cart_items"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.carts
    WHERE carts.id = cart_items.cart_id
    AND carts.cliente_id = auth.uid()
  )
);

CREATE POLICY "Users can update own cart items"
ON "public"."cart_items"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.carts
    WHERE carts.id = cart_items.cart_id
    AND carts.cliente_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own cart items"
ON "public"."cart_items"
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.carts
    WHERE carts.id = cart_items.cart_id
    AND carts.cliente_id = auth.uid()
  )
);
