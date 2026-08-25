import "reflect-metadata";
import { World as CucumberWorld, setWorldConstructor } from "@cucumber/cucumber";
import { Test, type TestingModule } from "@nestjs/testing";
import type {
  EstadoUnidad,
  Rol,
  ToolModel,
  ToolUnit,
  ToolUnitStatusLogEntry,
  Order,
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

import { ORDER_REPOSITORY } from "../../../src/modules/orders/infrastructure/orders.tokens";
import { InMemoryOrderRepository } from "../../../src/modules/orders/infrastructure/in-memory/in-memory-order.repository";
import { CotizarOrdenUseCase } from "../../../src/modules/orders/application/cotizar-orden.use-case";
import { CrearOrdenUseCase } from "../../../src/modules/orders/application/crear-orden.use-case";
import { ObtenerOrdenUseCase } from "../../../src/modules/orders/application/obtener-orden.use-case";
import type { QuoteResult } from "../../../src/modules/pricing/domain/pricing-calculator.service";

/**
 * World de Cucumber para los escenarios de `01_catalogo_inventario.feature`
 * y `02_cotizacion_alquiler_venta.feature`.
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

  cotizarOrden!: CotizarOrdenUseCase;
  crearOrden!: CrearOrdenUseCase;
  obtenerOrden!: ObtenerOrdenUseCase;

  usuarioActualId!: string;
  rolActual!: Rol;

  ultimoModelo?: ToolModel;
  ultimaUnidad?: ToolUnit;
  ultimosLogs: ToolUnitStatusLogEntry[] = [];
  ultimaDisponibilidad?: DisponibilidadModelo;

  ultimaCotizacion?: QuoteResult;
  ultimaOrden?: Order;

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
        { provide: ORDER_REPOSITORY, useClass: InMemoryOrderRepository },
        RegistrarModeloUseCase,
        BuscarCatalogoUseCase,
        ObtenerModeloPorIdUseCase,
        RegistrarUnidadUseCase,
        ObtenerUnidadUseCase,
        ActualizarEstadoUnidadUseCase,
        ConsultarDisponibilidadUseCase,
        CotizarOrdenUseCase,
        CrearOrdenUseCase,
        ObtenerOrdenUseCase,
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

    this.cotizarOrden = this.moduleRef.get(CotizarOrdenUseCase);
    this.crearOrden = this.moduleRef.get(CrearOrdenUseCase);
    this.obtenerOrden = this.moduleRef.get(ObtenerOrdenUseCase);

    this.ultimosLogs = [];
  }
}

setWorldConstructor(ToolboxWorld);

// Re-exportado para que los step definitions no necesiten importar
// `EstadoUnidad` desde shared-types directamente en cada archivo.
export type { EstadoUnidad };
