import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/interface/auth.module";
import { CatalogInventoryModule } from "../../catalog-inventory/interface/catalog-inventory.module";
import { CotizarOrdenUseCase } from "../application/cotizar-orden.use-case";
import { CrearOrdenUseCase } from "../application/crear-orden.use-case";
import { ObtenerOrdenUseCase } from "../application/obtener-orden.use-case";
import { ORDER_REPOSITORY } from "../infrastructure/orders.tokens";
import { PrismaOrderRepository } from "../infrastructure/prisma/prisma-order.repository";
import { OrdersController } from "./orders.controller";
import { PrismaService } from "../../catalog-inventory/infrastructure/prisma/prisma.service";

@Module({
  imports: [AuthModule, CatalogInventoryModule],
  controllers: [OrdersController],
  providers: [
    PrismaService,
    { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
    CotizarOrdenUseCase,
    CrearOrdenUseCase,
    ObtenerOrdenUseCase,
  ],
  exports: [
    ORDER_REPOSITORY,
    CotizarOrdenUseCase,
    CrearOrdenUseCase,
    ObtenerOrdenUseCase,
  ],
})
export class OrdersModule {}
