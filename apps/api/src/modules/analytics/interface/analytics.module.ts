import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/interface/auth.module";
import { ConsultarIngresosUseCase } from "../application/consultar-ingresos.use-case";
import { REVENUE_REPOSITORY } from "../infrastructure/analytics.tokens";
import { PrismaRevenueRepository } from "../infrastructure/prisma/prisma-revenue.repository";
import { PrismaService } from "../../catalog-inventory/infrastructure/prisma/prisma.service";
import { AnalyticsController } from "./analytics.controller";

/**
 * AnalyticsModule (Sprint 6, Issue #19 / HU-7.1 — RF de Analítica Fase 1).
 *
 * Solo cubre `GET /analytics/revenue` (el único escenario `@Fase1` de
 * `features/07_kpis_analitica.feature`) — `/analytics/roi`,
 * `/analytics/utilization` y `/analytics/delivery-productivity` son
 * `@Fase2` (Sprint 10, Issues #20/#21) y quedan fuera de alcance a
 * propósito acá, aunque ya estén declarados en openapi.yaml.
 *
 * Wiring de producción por defecto: `PrismaRevenueRepository` (requiere
 * `DATABASE_URL`). Los tests/BDD arman su propio `TestingModule` con
 * `InMemoryRevenueRepository`, mismo criterio que el resto de los módulos.
 */
@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [
    PrismaService,
    { provide: REVENUE_REPOSITORY, useClass: PrismaRevenueRepository },
    ConsultarIngresosUseCase,
  ],
  exports: [REVENUE_REPOSITORY, ConsultarIngresosUseCase],
})
export class AnalyticsModule {}
