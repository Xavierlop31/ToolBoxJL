import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/interface/auth.module";
import { CatalogInventoryModule } from "../../catalog-inventory/interface/catalog-inventory.module";
import { PrismaService } from "../../catalog-inventory/infrastructure/prisma/prisma.service";
import { OrdersModule } from "../../orders/interface/orders.module";
import { ActualizarCantidadCarritoUseCase } from "../application/actualizar-cantidad-carrito.use-case";
import { AgregarItemCarritoUseCase } from "../application/agregar-item-carrito.use-case";
import { CheckoutCartUseCase } from "../application/checkout-cart.use-case";
import { EliminarItemCarritoUseCase } from "../application/eliminar-item-carrito.use-case";
import { ObtenerCarritoUseCase } from "../application/obtener-carrito.use-case";
import { CART_REPOSITORY } from "../infrastructure/cart.tokens";
import { PrismaCartRepository } from "../infrastructure/prisma/prisma-cart.repository";
import { CartController } from "./cart.controller";

/**
 * CartModule (Sprint 9, Issues #26/#27 — HU-10.1/10.2; extendido Sprint 13,
 * Issue #146 — HU-12.3, `PATCH`/`DELETE /cart/items/{id}` +
 * `POST /orders/checkout-cart`). No hay ciclo de DI con
 * CatalogInventoryModule (a diferencia de OrdersModule↔CatalogInventoryModule):
 * CartModule solo CONSUME `TOOL_MODEL_REPOSITORY` de ahí (para validar
 * `modelo_id` y recalcular precios), CatalogInventoryModule nunca necesita
 * nada de CartModule — no hace falta `forwardRef`.
 *
 * `OrdersModule` se importa acá (Sprint 13) para que `CheckoutCartUseCase`
 * pueda inyectar `CrearOrdenUseCase` y reusar su lógica de creación de
 * orden una vez por línea del carrito — sin `forwardRef`: OrdersModule
 * nunca necesita nada de CartModule, así que no hay ciclo (a diferencia del
 * ciclo genuino OrdersModule↔CatalogInventoryModule).
 *
 * Wiring de producción por defecto: `PrismaCartRepository` (requiere
 * `DATABASE_URL`). Los tests/BDD arman su propio `TestingModule` con
 * `InMemoryCartRepository`, mismo criterio que el resto de los módulos.
 */
@Module({
  imports: [AuthModule, CatalogInventoryModule, OrdersModule],
  controllers: [CartController],
  providers: [
    PrismaService,
    { provide: CART_REPOSITORY, useClass: PrismaCartRepository },
    ObtenerCarritoUseCase,
    AgregarItemCarritoUseCase,
    ActualizarCantidadCarritoUseCase,
    EliminarItemCarritoUseCase,
    CheckoutCartUseCase,
  ],
  exports: [
    CART_REPOSITORY,
    ObtenerCarritoUseCase,
    AgregarItemCarritoUseCase,
    ActualizarCantidadCarritoUseCase,
    EliminarItemCarritoUseCase,
    CheckoutCartUseCase,
  ],
})
export class CartModule {}
