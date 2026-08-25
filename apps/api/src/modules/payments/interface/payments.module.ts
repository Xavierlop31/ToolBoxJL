import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/interface/auth.module";
import { CatalogInventoryModule } from "../../catalog-inventory/interface/catalog-inventory.module";
import { OrdersModule } from "../../orders/interface/orders.module";
import { LogisticsModule } from "../../logistics/interface/logistics.module";
import { PagarOrdenUseCase } from "../application/pagar-orden.use-case";
import { ConfirmarPagoContraEntregaUseCase } from "../application/confirmar-pago-contra-entrega.use-case";
import { PAYMENT_REPOSITORY, WOMPI_GATEWAY } from "../infrastructure/payments.tokens";
import { PrismaPaymentRepository } from "../infrastructure/prisma/prisma-payment.repository";
import { WompiGatewayService } from "../infrastructure/wompi/wompi-gateway.service";
import { PrismaService } from "../../catalog-inventory/infrastructure/prisma/prisma.service";
import { PaymentsController } from "./payments.controller";

/**
 * PaymentsModule (Sprint 3, HU-2.2/2.3/2.4 — RF-2.2 a RF-2.4).
 *
 * Wiring de producción por defecto: `PrismaPaymentRepository` (requiere
 * `DATABASE_URL`) y `WompiGatewayService` (implementación real contra Wompi
 * sandbox, requiere `WOMPI_PRIVATE_KEY`/`WOMPI_PUBLIC_KEY` — nunca probada
 * contra la API real en este entorno, ver
 * infrastructure/wompi/wompi-gateway.service.ts). Los tests/BDD
 * (apps/api/test/bdd) arman su propio `TestingModule` con
 * `InMemoryPaymentRepository`/`InMemoryWompiGateway`, mismo criterio que
 * CatalogInventoryModule/OrdersModule.
 *
 * Sprint 4: importa `LogisticsModule` (necesita `SHIPMENT_REPOSITORY` en
 * `PagarOrdenUseCase` para crear el Shipment de tipo "entrega" cuando la
 * orden queda confirmada — decisión del Tech Lead para evitar el ciclo de
 * imports PaymentsModule↔LogisticsModule).
 */
@Module({
  imports: [AuthModule, CatalogInventoryModule, OrdersModule, LogisticsModule],
  controllers: [PaymentsController],
  providers: [
    PrismaService,
    { provide: PAYMENT_REPOSITORY, useClass: PrismaPaymentRepository },
    { provide: WOMPI_GATEWAY, useClass: WompiGatewayService },
    PagarOrdenUseCase,
    ConfirmarPagoContraEntregaUseCase,
  ],
  exports: [
    PAYMENT_REPOSITORY,
    WOMPI_GATEWAY,
    PagarOrdenUseCase,
    ConfirmarPagoContraEntregaUseCase,
  ],
})
export class PaymentsModule {}
