import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/interface/auth.module";
import { CatalogInventoryModule } from "../../catalog-inventory/interface/catalog-inventory.module";
import { PrismaService } from "../../catalog-inventory/infrastructure/prisma/prisma.service";
import { AgregarItemCarritoUseCase } from "../application/agregar-item-carrito.use-case";
import { ObtenerCarritoUseCase } from "../application/obtener-carrito.use-case";
import { CART_REPOSITORY } from "../infrastructure/cart.tokens";
import { PrismaCartRepository } from "../infrastructure/prisma/prisma-cart.repository";
import { CartController } from "./cart.controller";

/**
 * CartModule (Sprint 9, Issues #26/#27 — HU-10.1/10.2). No hay ciclo de DI
 * con CatalogInventoryModule (a diferencia de OrdersModule↔CatalogInventoryModule):
 * CartModule solo CONSUME `TOOL_MODEL_REPOSITORY` de ahí (para validar
 * `modelo_id` y recalcular precios), CatalogInventoryModule nunca necesita
 * nada de CartModule — no hace falta `forwardRef`.
 *
 * Wiring de producción por defecto: `PrismaCartRepository` (requiere
 * `DATABASE_URL`). Los tests/BDD arman su propio `TestingModule` con
 * `InMemoryCartRepository`, mismo criterio que el resto de los módulos.
 */
@Module({
  imports: [AuthModule, CatalogInventoryModule],
  controllers: [CartController],
  providers: [
    PrismaService,
    { provide: CART_REPOSITORY, useClass: PrismaCartRepository },
    ObtenerCarritoUseCase,
    AgregarItemCarritoUseCase,
  ],
  exports: [CART_REPOSITORY, ObtenerCarritoUseCase, AgregarItemCarritoUseCase],
})
export class CartModule {}
