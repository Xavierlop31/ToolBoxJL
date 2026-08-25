import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/interface/auth.module";
import { ActualizarEstadoUnidadUseCase } from "../application/actualizar-estado-unidad.use-case";
import { BuscarCatalogoUseCase } from "../application/buscar-catalogo.use-case";
import { ConsultarDisponibilidadUseCase } from "../application/consultar-disponibilidad.use-case";
import { ObtenerModeloPorIdUseCase } from "../application/obtener-modelo-por-id.use-case";
import { ObtenerUnidadUseCase } from "../application/obtener-unidad.use-case";
import { RegistrarModeloUseCase } from "../application/registrar-modelo.use-case";
import { RegistrarUnidadUseCase } from "../application/registrar-unidad.use-case";
import {
  QR_CODE_GENERATOR,
  TOOL_MODEL_REPOSITORY,
  TOOL_UNIT_REPOSITORY,
  TOOL_UNIT_STATUS_LOG_REPOSITORY,
} from "../infrastructure/catalog-inventory.tokens";
import { QrCodeGeneratorService } from "../infrastructure/qr/qrcode-generator.service";
import { PrismaService } from "../infrastructure/prisma/prisma.service";
import { PrismaToolModelRepository } from "../infrastructure/prisma/prisma-tool-model.repository";
import { PrismaToolUnitRepository } from "../infrastructure/prisma/prisma-tool-unit.repository";
import { PrismaToolUnitStatusLogRepository } from "../infrastructure/prisma/prisma-tool-unit-status-log.repository";
import { CatalogController } from "./catalog.controller";
import { InventoryController } from "./inventory.controller";

/**
 * CatalogModule + InventoryModule (docs/DESIGN.md §3, punto 1: se describen
 * como un único bounded context — "CatalogModule / InventoryModule" — así
 * que, a diferencia de AuthModule, se implementan acá como un solo módulo
 * de Nest en vez de dos, para no duplicar los repositorios de `ToolModel`
 * que ambos necesitan (catálogo público + alta de unidades/disponibilidad).
 * Decisión documentada del Backend Developer, no pedida explícitamente por
 * el Tech Lead pero consistente con la agrupación de docs/DESIGN.md.
 *
 * Wiring de producción por defecto: las implementaciones REALES de Prisma
 * (requieren `DATABASE_URL` — ver `PrismaService`). Los tests/BDD (Cucumber,
 * apps/api/test/bdd) NO importan este módulo tal cual: arman su propio
 * `TestingModule` con las implementaciones in-memory de
 * `infrastructure/in-memory`, así corren sin necesitar una base real.
 */
@Module({
  imports: [AuthModule],
  controllers: [CatalogController, InventoryController],
  providers: [
    PrismaService,
    { provide: TOOL_MODEL_REPOSITORY, useClass: PrismaToolModelRepository },
    { provide: TOOL_UNIT_REPOSITORY, useClass: PrismaToolUnitRepository },
    {
      provide: TOOL_UNIT_STATUS_LOG_REPOSITORY,
      useClass: PrismaToolUnitStatusLogRepository,
    },
    { provide: QR_CODE_GENERATOR, useClass: QrCodeGeneratorService },
    RegistrarModeloUseCase,
    BuscarCatalogoUseCase,
    ObtenerModeloPorIdUseCase,
    RegistrarUnidadUseCase,
    ObtenerUnidadUseCase,
    ActualizarEstadoUnidadUseCase,
    ConsultarDisponibilidadUseCase,
  ],
  exports: [
    TOOL_MODEL_REPOSITORY,
    TOOL_UNIT_REPOSITORY,
    TOOL_UNIT_STATUS_LOG_REPOSITORY,
    QR_CODE_GENERATOR,
    RegistrarModeloUseCase,
    BuscarCatalogoUseCase,
    ObtenerModeloPorIdUseCase,
    RegistrarUnidadUseCase,
    ObtenerUnidadUseCase,
    ActualizarEstadoUnidadUseCase,
    ConsultarDisponibilidadUseCase,
  ],
})
export class CatalogInventoryModule {}
