import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/interface/auth.module";
import { CatalogInventoryModule } from "../../catalog-inventory/interface/catalog-inventory.module";
import { OrdersModule } from "../../orders/interface/orders.module";
import { PaymentsModule } from "../../payments/interface/payments.module";
import { LogisticsModule } from "../../logistics/interface/logistics.module";
import { RegistrarInspeccionUseCase } from "../application/registrar-inspeccion.use-case";
import { ConsultarMoraUseCase } from "../application/consultar-mora.use-case";
import { EjecutarMoraCalculatorUseCase } from "../application/ejecutar-mora-calculator.use-case";
import { INSPECTION_CHECKLIST_REPOSITORY } from "../infrastructure/inspections.tokens";
import { PrismaInspectionChecklistRepository } from "../infrastructure/prisma/prisma-inspection-checklist.repository";
import { PrismaService } from "../../catalog-inventory/infrastructure/prisma/prisma.service";
import { InspectionsController } from "./inspections.controller";
import { BillingController } from "./billing.controller";

/**
 * InspectionModule (Sprint 5, Issues #14-#16 / HU-5.1 a 5.3 —
 * RF-4.1/RF-4.2/RF-4.3).
 *
 * Importa `LogisticsModule` (`SHIPMENT_REPOSITORY`, para transicionar el
 * Shipment y navegar a la Order al registrar una recepción),
 * `OrdersModule` (`ORDER_REPOSITORY`, para transicionar la Order y para
 * `listarVencidasSinMora`), `PaymentsModule` (`PAYMENT_REPOSITORY`/
 * `WOMPI_GATEWAY`, para ejecutar la garantía y emitir el comprobante de
 * mora) y `CatalogInventoryModule` (`TOOL_UNIT_REPOSITORY`/
 * `TOOL_MODEL_REPOSITORY`, para validar la unidad inspeccionada y para
 * calcular la mora a partir de la tarifa/interés del modelo). Cada uno se
 * importa acá de forma directa (no transitiva) — mismo criterio que
 * `PaymentsModule` en Sprint 4 (los imports de Nest no son transitivos: solo
 * se recibe lo que el módulo importado declara en su propio `exports`).
 *
 * HU-5.2 (RF-4.1, "Cliente elige la modalidad de devolución") NO agrega
 * código nuevo acá — ya está satisfecha por
 * `PricingCalculatorService.calcularRecargoLogistico` (Sprint 4, en
 * `main`); Issue #15 se cierra en este sprint solo con el test BDD que
 * conecta el escenario Gherkin correspondiente (ver
 * `apps/api/test/bdd/step-definitions/devoluciones-mora.steps.ts`).
 *
 * Wiring de producción por defecto: `PrismaInspectionChecklistRepository`
 * (requiere `DATABASE_URL`). Los tests/BDD arman su propio `TestingModule`
 * con `InMemoryInspectionChecklistRepository`, mismo criterio que el resto
 * de los módulos.
 */
@Module({
  imports: [AuthModule, CatalogInventoryModule, OrdersModule, PaymentsModule, LogisticsModule],
  controllers: [InspectionsController, BillingController],
  providers: [
    PrismaService,
    { provide: INSPECTION_CHECKLIST_REPOSITORY, useClass: PrismaInspectionChecklistRepository },
    RegistrarInspeccionUseCase,
    ConsultarMoraUseCase,
    EjecutarMoraCalculatorUseCase,
  ],
  exports: [
    INSPECTION_CHECKLIST_REPOSITORY,
    RegistrarInspeccionUseCase,
    ConsultarMoraUseCase,
    EjecutarMoraCalculatorUseCase,
  ],
})
export class InspectionsModule {}
