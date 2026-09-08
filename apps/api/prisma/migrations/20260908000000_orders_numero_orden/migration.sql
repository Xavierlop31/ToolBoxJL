-- ToolBox JL — número de orden legible para el cliente (pedido del
-- Arquitecto: un GUID no es un identificador reconocible para un usuario
-- normal). Agrega `orders.numero_orden`, un entero autoincremental — el
-- formato "TJL0000001" (prefijo + 7 dígitos con ceros a la izquierda) se
-- arma en la capa de dominio (PrismaOrderRepository.aDominio), NO acá: así
-- el ancho del padding se puede ajustar sin migración.
--
-- *** ESTA MIGRACIÓN NO FUE EJECUTADA CONTRA UNA BASE REAL *** — mismo
-- disclaimer que el resto de las migraciones de este repo (ver cabecera de
-- schema.prisma). *** IMPORTANTE, más que en migraciones anteriores ***:
-- dos incidentes de 500 en producción este mismo día (ver memoria de
-- sesión "Migraciones Prisma no aplicadas a Supabase") fueron exactamente
-- por esto — una migración quedó en `main` sin correrse contra el
-- Supabase real. Correr este SQL a mano en el SQL Editor de Supabase
-- ANTES de que se despliegue el código que la usa (PrismaOrderRepository
-- ya selecciona `numeroOrden` en cuanto este commit llegue a producción).
--
-- No se puede usar `ADD COLUMN ... SERIAL` directo porque Postgres no
-- garantiza qué orden físico usa para numerar las filas existentes al
-- crear la secuencia y poblarlas en el mismo paso — acá se hace en pasos
-- separados para numerar las órdenes existentes por `created_at` (más
-- antigua = TJL0000001), que es el orden que un cliente esperaría.

-- 1) Columna nueva, sin default todavía (para controlar el backfill a mano).
ALTER TABLE "orders" ADD COLUMN "numero_orden" INTEGER;

-- 2) Backfill de las órdenes existentes, numeradas por fecha de creación.
WITH numeradas AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS numero
  FROM "orders"
)
UPDATE "orders"
SET "numero_orden" = numeradas.numero
FROM numeradas
WHERE "orders".id = numeradas.id;

-- 3) Secuencia para las órdenes futuras, arrancando después del máximo ya
--    asignado (0 si la tabla estaba vacía).
CREATE SEQUENCE "orders_numero_orden_seq";
SELECT setval('"orders_numero_orden_seq"', COALESCE((SELECT MAX("numero_orden") FROM "orders"), 0) + 1, false);

-- 4) Default + NOT NULL + UNIQUE — mismo patrón que genera Prisma para
--    `@default(autoincrement())`, y la secuencia queda "owned" por la
--    columna (se borra sola si algún día se borra la columna).
ALTER TABLE "orders" ALTER COLUMN "numero_orden" SET DEFAULT nextval('"orders_numero_orden_seq"');
ALTER TABLE "orders" ALTER COLUMN "numero_orden" SET NOT NULL;
ALTER TABLE "orders" ADD CONSTRAINT "orders_numero_orden_key" UNIQUE ("numero_orden");
ALTER SEQUENCE "orders_numero_orden_seq" OWNED BY "orders"."numero_orden";
