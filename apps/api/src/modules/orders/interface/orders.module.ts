import { forwardRef, Module } from "@nestjs/common";
import { AuthModule } from "../../auth/interface/auth.module";
import { CatalogInventoryModule } from "../../catalog-inventory/interface/catalog-inventory.module";
import { CotizarOrdenUseCase } from "../application/cotizar-orden.use-case";
import { CrearOrdenUseCase } from "../application/crear-orden.use-case";
import { ObtenerOrdenUseCase } from "../application/obtener-orden.use-case";
import { ExtenderAlquilerUseCase } from "../application/extender-alquiler.use-case";
import { ORDER_REPOSITORY } from "../infrastructure/orders.tokens";
import { PrismaOrderRepository } from "../infrastructure/prisma/prisma-order.repository";
import { OrdersController } from "./orders.controller";
import { PrismaService } from "../../catalog-inventory/infrastructure/prisma/prisma.service";

/**
 * `forwardRef(() => CatalogInventoryModule)`: lado espejo del ciclo genuino
 * documentado en CatalogInventoryModule (ver el comentario de cabecera de ese
 * módulo) — CatalogInventoryModule necesita `ORDER_REPOSITORY` de acá, y este
 * módulo necesita `TOOL_MODEL_REPOSITORY`/`TOOL_UNIT_REPOSITORY` de allá para
 * cotizar y crear órdenes.
 */
@Module({
  imports: [AuthModule, forwardRef(() => CatalogInventoryModule)],
  controllers: [OrdersController],
  providers: [
    PrismaService,
    { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
    CotizarOrdenUseCase,
    CrearOrdenUseCase,
    ObtenerOrdenUseCase,
    ExtenderAlquilerUseCase,
  ],
  exports: [
    ORDER_REPOSITORY,
    CotizarOrdenUseCase,
    CrearOrdenUseCase,
    ObtenerOrdenUseCase,
    ExtenderAlquilerUseCase,
  ],
})
export class OrdersModule {}
