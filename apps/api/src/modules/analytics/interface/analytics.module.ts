import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/interface/auth.module";
import { ConsultarIngresosUseCase } from "../application/consultar-ingresos.use-case";
import { ConsultarRoiUseCase } from "../application/consultar-roi.use-case";
import { ConsultarUtilizacionUseCase } from "../application/consultar-utilizacion.use-case";
import { ConsultarProductividadRepartidoresUseCase } from "../application/consultar-productividad-repartidores.use-case";
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
 * Wiring de producción por defecto: implementaciones `Prisma*Repository`
 * (requieren `DATABASE_URL`). Los tests/BDD arman su propio `TestingModule`
 * con las implementaciones `InMemory*Repository`, mismo criterio que el
 * resto de los módulos.
 */
@Module({
  imports: [AuthModule],
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
  ],
})
export class AnalyticsModule {}
