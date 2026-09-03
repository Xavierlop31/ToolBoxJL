import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/interface/auth.module";
import { CatalogInventoryModule } from "../../catalog-inventory/interface/catalog-inventory.module";
import { OrdersModule } from "../../orders/interface/orders.module";
import { UsersModule } from "../../users/interface/users.module";
import { ConsultarIngresosUseCase } from "../application/consultar-ingresos.use-case";
import { ConsultarRoiUseCase } from "../application/consultar-roi.use-case";
import { ConsultarUtilizacionUseCase } from "../application/consultar-utilizacion.use-case";
import { ConsultarProductividadRepartidoresUseCase } from "../application/consultar-productividad-repartidores.use-case";
import { ObtenerDashboardKpisUseCase } from "../application/obtener-dashboard-kpis.use-case";
import {
  DELIVERY_PRODUCTIVITY_REPOSITORY,
  REVENUE_REPOSITORY,
  ROI_REPOSITORY,
  UTILIZATION_REPOSITORY,
} from "../infrastructure/analytics.tokens";
import { PrismaRevenueRepository } from "../infrastructure/prisma/prisma-revenue.repository";
import { PrismaRoiRepository } from "../infrastructure/prisma/prisma-roi.repository";
import { PrismaUtilizationRepository } from "../infrastructure/prisma/prisma-utilization.repository";
import { PrismaDeliveryProductivityRepository } from "../infrastructure/prisma/prisma-delivery-productivity.repository";
import { PrismaService } from "../../catalog-inventory/infrastructure/prisma/prisma.service";
import { AnalyticsController } from "./analytics.controller";

/**
 * AnalyticsModule. Sprint 6 (Issue #19 / HU-7.1 — RF de Analítica Fase 1):
 * `GET /analytics/revenue`. Sprint 10 (Issues #20/#21, HU-7.2/7.3 — BI
 * avanzado, `@Fase2` de `features/07_kpis_analitica.feature`) agrega
 * `GET /analytics/roi`, `GET /analytics/utilization` y
 * `GET /analytics/delivery-productivity` — ver los doc-comments de sus
 * respectivos repos de dominio (`roi.repository.ts`,
 * `utilization.repository.ts`, `delivery-productivity.repository.ts`) para
 * los gaps de datos documentados de cada uno.
 *
 * Sprint 15 (Issue #153, HU-15.1, Épica 15): `GET /analytics/dashboard-kpis`
 * (`ObtenerDashboardKpisUseCase`) — panel ejecutivo consolidado. Importa
 * `CatalogInventoryModule` (`TOOL_UNIT_STATUS_LOG_REPOSITORY`/
 * `TOOL_UNIT_REPOSITORY`/`TOOL_MODEL_REPOSITORY`, para la alerta
 * `mantenimiento_recurrente`), `OrdersModule` (`ORDER_REPOSITORY`, para la
 * alerta `mora_cliente`) y `UsersModule` (`USER_REPOSITORY`, para el nombre
 * del cliente en esa misma alerta) — sin `forwardRef`: a diferencia del
 * ciclo genuino entre CatalogInventoryModule↔OrdersModule (ver el
 * doc-comment de `CatalogInventoryModule`), ninguno de estos 3 módulos
 * importa AnalyticsModule, mismo criterio de import directo que
 * `LogisticsModule` (Sprint 14) ya usa para combinar estos mismos 3
 * módulos sin ciclo.
 *
 * Wiring de producción por defecto: implementaciones `Prisma*Repository`
 * (requieren `DATABASE_URL`). Los tests/BDD arman su propio `TestingModule`
 * con las implementaciones `InMemory*Repository`, mismo criterio que el
 * resto de los módulos.
 */
@Module({
  imports: [AuthModule, CatalogInventoryModule, OrdersModule, UsersModule],
  controllers: [AnalyticsController],
  providers: [
    PrismaService,
    { provide: REVENUE_REPOSITORY, useClass: PrismaRevenueRepository },
    { provide: ROI_REPOSITORY, useClass: PrismaRoiRepository },
    { provide: UTILIZATION_REPOSITORY, useClass: PrismaUtilizationRepository },
    { provide: DELIVERY_PRODUCTIVITY_REPOSITORY, useClass: PrismaDeliveryProductivityRepository },
    ConsultarIngresosUseCase,
    ConsultarRoiUseCase,
    ConsultarUtilizacionUseCase,
    ConsultarProductividadRepartidoresUseCase,
    ObtenerDashboardKpisUseCase,
  ],
  exports: [
    REVENUE_REPOSITORY,
    ROI_REPOSITORY,
    UTILIZATION_REPOSITORY,
    DELIVERY_PRODUCTIVITY_REPOSITORY,
    ConsultarIngresosUseCase,
    ConsultarRoiUseCase,
    ConsultarUtilizacionUseCase,
    ConsultarProductividadRepartidoresUseCase,
    ObtenerDashboardKpisUseCase,
  ],
})
export class AnalyticsModule {}
