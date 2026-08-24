import "reflect-metadata";
import { World as CucumberWorld, setWorldConstructor } from "@cucumber/cucumber";
import { Test, type TestingModule } from "@nestjs/testing";
import type {
  EstadoUnidad,
  Rol,
  ToolModel,
  ToolUnit,
  ToolUnitStatusLogEntry,
} from "@toolboxjl/shared-types";

import { ActualizarEstadoUnidadUseCase } from "../../../src/modules/catalog-inventory/application/actualizar-estado-unidad.use-case";
import { BuscarCatalogoUseCase } from "../../../src/modules/catalog-inventory/application/buscar-catalogo.use-case";
import { ConsultarDisponibilidadUseCase, type DisponibilidadModelo } from "../../../src/modules/catalog-inventory/application/consultar-disponibilidad.use-case";
import { ObtenerModeloPorIdUseCase } from "../../../src/modules/catalog-inventory/application/obtener-modelo-por-id.use-case";
import { ObtenerUnidadUseCase } from "../../../src/modules/catalog-inventory/application/obtener-unidad.use-case";
import { RegistrarModeloUseCase } from "../../../src/modules/catalog-inventory/application/registrar-modelo.use-case";
import { RegistrarUnidadUseCase } from "../../../src/modules/catalog-inventory/application/registrar-unidad.use-case";
import {
  QR_CODE_GENERATOR,
  TOOL_MODEL_REPOSITORY,
  TOOL_UNIT_REPOSITORY,
  TOOL_UNIT_STATUS_LOG_REPOSITORY,
} from "../../../src/modules/catalog-inventory/infrastructure/catalog-inventory.tokens";
import { InMemoryToolModelRepository } from "../../../src/modules/catalog-inventory/infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryToolUnitRepository } from "../../../src/modules/catalog-inventory/infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryToolUnitStatusLogRepository } from "../../../src/modules/catalog-inventory/infrastructure/in-memory/in-memory-tool-unit-status-log.repository";
import { QrCodeGeneratorService } from "../../../src/modules/catalog-inventory/infrastructure/qr/qrcode-generator.service";

/**
 * World de Cucumber para los escenarios de `01_catalogo_inventario.feature`
 * (RF-1.1 a 1.4). Arranca un `@nestjs/testing` `TestingModule` "a mano" con
 * SOLO las implementaciones in-memory de los repositorios — no importa
 * `CatalogInventoryModule` (que trae `PrismaService`/`DATABASE_URL`) — así
 * estos escenarios corren en CI sin necesitar una base real.
 *
 * Decisión documentada: estos steps ejercitan la capa de aplicación (los
 * use cases) directamente, no la capa HTTP con guards. El RBAC en sí ya
 * tiene cobertura unitaria dedicada en AuthModule (Sprint 0,
 * roles.guard.spec.ts) — acá el rol "logueado" en cada Given es solo
 * contexto de negocio (ej. quién queda como autor de una entrada de hoja de
 * vida), no algo que este World re-verifique a nivel de guard.
 */
export class ToolboxWorld extends CucumberWorld {
  moduleRef!: TestingModule;

  registrarModelo!: RegistrarModeloUseCase;
  buscarCatalogo!: BuscarCatalogoUseCase;
  obtenerModelo!: ObtenerModeloPorIdUseCase;
  registrarUnidad!: RegistrarUnidadUseCase;
  obtenerUnidad!: ObtenerUnidadUseCase;
  actualizarEstado!: ActualizarEstadoUnidadUseCase;
  consultarDisponibilidad!: ConsultarDisponibilidadUseCase;

  usuarioActualId!: string;
  rolActual!: Rol;

  ultimoModelo?: ToolModel;
  ultimaUnidad?: ToolUnit;
  ultimosLogs: ToolUnitStatusLogEntry[] = [];
  ultimaDisponibilidad?: DisponibilidadModelo;

  async iniciar(): Promise<void> {
    this.moduleRef = await Test.createTestingModule({
      providers: [
        { provide: TOOL_MODEL_REPOSITORY, useClass: InMemoryToolModelRepository },
        { provide: TOOL_UNIT_REPOSITORY, useClass: InMemoryToolUnitRepository },
        {
          provide: TOOL_UNIT_STATUS_LOG_REPOSITORY,
          useClass: InMemoryToolUnitStatusLogRepository,
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
    }).compile();

    this.registrarModelo = this.moduleRef.get(RegistrarModeloUseCase);
    this.buscarCatalogo = this.moduleRef.get(BuscarCatalogoUseCase);
    this.obtenerModelo = this.moduleRef.get(ObtenerModeloPorIdUseCase);
    this.registrarUnidad = this.moduleRef.get(RegistrarUnidadUseCase);
    this.obtenerUnidad = this.moduleRef.get(ObtenerUnidadUseCase);
    this.actualizarEstado = this.moduleRef.get(ActualizarEstadoUnidadUseCase);
    this.consultarDisponibilidad = this.moduleRef.get(
      ConsultarDisponibilidadUseCase,
    );

    this.ultimosLogs = [];
  }
}

setWorldConstructor(ToolboxWorld);

// Re-exportado para que los step definitions no necesiten importar
// `EstadoUnidad` desde shared-types directamente en cada archivo.
export type { EstadoUnidad };
