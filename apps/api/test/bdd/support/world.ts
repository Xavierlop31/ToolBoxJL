import "reflect-metadata";
import { World as CucumberWorld, setWorldConstructor } from "@cucumber/cucumber";
import { Test, type TestingModule } from "@nestjs/testing";
import type {
  MetodoPago,
  Payment,
  Rol,
  ToolModel,
  ToolUnit,
  ToolUnitStatusLogEntry,
  Order,
  Vehicle,
  Shipment,
  Route,
  InspectionChecklist,
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

import { PAYMENT_REPOSITORY, WOMPI_GATEWAY } from "../../../src/modules/payments/infrastructure/payments.tokens";
import { InMemoryPaymentRepository } from "../../../src/modules/payments/infrastructure/in-memory/in-memory-payment.repository";
import { InMemoryWompiGateway } from "../../../src/modules/payments/infrastructure/wompi/in-memory-wompi-gateway";
import {
  PagarOrdenUseCase,
  type ResultadoPagoOrden,
} from "../../../src/modules/payments/application/pagar-orden.use-case";
import { ConfirmarPagoContraEntregaUseCase } from "../../../src/modules/payments/application/confirmar-pago-contra-entrega.use-case";

import { VEHICLE_REPOSITORY } from "../../../src/modules/fleet/infrastructure/fleet.tokens";
import { InMemoryVehicleRepository } from "../../../src/modules/fleet/infrastructure/in-memory/in-memory-vehicle.repository";
import { RegistrarVehiculoUseCase } from "../../../src/modules/fleet/application/registrar-vehiculo.use-case";

import { SHIPMENT_REPOSITORY, ROUTE_REPOSITORY } from "../../../src/modules/logistics/infrastructure/logistics.tokens";
import { InMemoryShipmentRepository } from "../../../src/modules/logistics/infrastructure/in-memory/in-memory-shipment.repository";
import { InMemoryRouteRepository } from "../../../src/modules/logistics/infrastructure/in-memory/in-memory-route.repository";
import { ListarPedidosPendientesUseCase } from "../../../src/modules/logistics/application/listar-pedidos-pendientes.use-case";
import { AsignarRutasUseCase } from "../../../src/modules/logistics/application/asignar-rutas.use-case";
import { ListarEnviosUseCase } from "../../../src/modules/logistics/application/listar-envios.use-case";
import type { ShipmentRepository } from "../../../src/modules/logistics/domain/shipment.repository";
import type { PaymentRepository } from "../../../src/modules/payments/domain/payment.repository";

import { INSPECTION_CHECKLIST_REPOSITORY } from "../../../src/modules/inspections/infrastructure/inspections.tokens";
import { InMemoryInspectionChecklistRepository } from "../../../src/modules/inspections/infrastructure/in-memory/in-memory-inspection-checklist.repository";
import { RegistrarInspeccionUseCase } from "../../../src/modules/inspections/application/registrar-inspeccion.use-case";
import {
  ConsultarMoraUseCase,
  type ComprobanteMora,
} from "../../../src/modules/inspections/application/consultar-mora.use-case";
import { EjecutarMoraCalculatorUseCase } from "../../../src/modules/inspections/application/ejecutar-mora-calculator.use-case";

import { REVENUE_REPOSITORY } from "../../../src/modules/analytics/infrastructure/analytics.tokens";
import { InMemoryRevenueRepository } from "../../../src/modules/analytics/infrastructure/in-memory/in-memory-revenue.repository";
import { ConsultarIngresosUseCase } from "../../../src/modules/analytics/application/consultar-ingresos.use-case";

/**
 * World de Cucumber para los escenarios de `01_catalogo_inventario.feature`,
 * `02_cotizacion_alquiler_venta.feature`, `03_pagos_garantia.feature`,
 * `04_logistica_flota.feature`, `05_devoluciones_inspeccion_mora.feature` y
 * `07_kpis_analitica.feature` (solo el escenario `@Fase1`).
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

  pagarOrden!: PagarOrdenUseCase;
  confirmarPagoContraEntrega!: ConfirmarPagoContraEntregaUseCase;

  registrarVehiculo!: RegistrarVehiculoUseCase;
  listarPedidosPendientes!: ListarPedidosPendientesUseCase;
  asignarRutas!: AsignarRutasUseCase;
  listarEnvios!: ListarEnviosUseCase;

  registrarInspeccion!: RegistrarInspeccionUseCase;
  consultarMora!: ConsultarMoraUseCase;
  ejecutarMoraCalculator!: EjecutarMoraCalculatorUseCase;
  /** Acceso directo a los repos in-memory — conveniencia para los steps de HU-5.1/5.3 (buscar el Shipment/Payment creados por otro caso de uso). */
  shipmentRepository!: ShipmentRepository;
  paymentRepository!: PaymentRepository;

  consultarIngresos!: ConsultarIngresosUseCase;
  /** Acceso directo — conveniencia para el step Given de HU-7.1 (sembrar pagos con fecha controlable). */
  revenueRepository!: InMemoryRevenueRepository;

  usuarioActualId!: string;
  rolActual!: Rol;

  ultimoModelo?: ToolModel;
  ultimaUnidad?: ToolUnit;
  ultimosLogs: ToolUnitStatusLogEntry[] = [];
  ultimaDisponibilidad?: DisponibilidadModelo;

  ultimaCotizacion?: QuoteResult;
  ultimaOrden?: Order;

  ultimoResultadoPago?: ResultadoPagoOrden;
  /** Método de pago fijado en el Given de escenarios que no lo reciben como parámetro directo. */
  metodoPagoEscenario?: MetodoPago;

  ultimoVehiculo?: Vehicle;
  ultimasRutas?: Route[];
  ultimosEnvios?: Shipment[];

  ultimoChecklist?: InspectionChecklist;
  ultimosComprobantesMora?: Payment[];
  ultimoComprobanteMora?: ComprobanteMora;
  /** Modalidad de devolución fijada en el Given del escenario HU-5.2 (Esquema del escenario). */
  returnModeEscenario?: "en_sede" | "recogida_domicilio";

  periodoEscenario?: string;
  ultimosIngresos?: Awaited<ReturnType<ConsultarIngresosUseCase["ejecutar"]>>;

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
        { provide: PAYMENT_REPOSITORY, useClass: InMemoryPaymentRepository },
        { provide: WOMPI_GATEWAY, useClass: InMemoryWompiGateway },
        { provide: VEHICLE_REPOSITORY, useClass: InMemoryVehicleRepository },
        { provide: SHIPMENT_REPOSITORY, useClass: InMemoryShipmentRepository },
        { provide: ROUTE_REPOSITORY, useClass: InMemoryRouteRepository },
        { provide: INSPECTION_CHECKLIST_REPOSITORY, useClass: InMemoryInspectionChecklistRepository },
        { provide: REVENUE_REPOSITORY, useClass: InMemoryRevenueRepository },
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
        PagarOrdenUseCase,
        ConfirmarPagoContraEntregaUseCase,
        RegistrarVehiculoUseCase,
        ListarPedidosPendientesUseCase,
        AsignarRutasUseCase,
        ListarEnviosUseCase,
        RegistrarInspeccionUseCase,
        ConsultarMoraUseCase,
        EjecutarMoraCalculatorUseCase,
        ConsultarIngresosUseCase,
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

    this.pagarOrden = this.moduleRef.get(PagarOrdenUseCase);
    this.confirmarPagoContraEntrega = this.moduleRef.get(
      ConfirmarPagoContraEntregaUseCase,
    );

    this.registrarVehiculo = this.moduleRef.get(RegistrarVehiculoUseCase);
    this.listarPedidosPendientes = this.moduleRef.get(ListarPedidosPendientesUseCase);
    this.asignarRutas = this.moduleRef.get(AsignarRutasUseCase);
    this.listarEnvios = this.moduleRef.get(ListarEnviosUseCase);

    this.registrarInspeccion = this.moduleRef.get(RegistrarInspeccionUseCase);
    this.consultarMora = this.moduleRef.get(ConsultarMoraUseCase);
    this.ejecutarMoraCalculator = this.moduleRef.get(EjecutarMoraCalculatorUseCase);
    this.shipmentRepository = this.moduleRef.get(SHIPMENT_REPOSITORY);
    this.paymentRepository = this.moduleRef.get(PAYMENT_REPOSITORY);

    this.consultarIngresos = this.moduleRef.get(ConsultarIngresosUseCase);
    this.revenueRepository = this.moduleRef.get(REVENUE_REPOSITORY);

    this.ultimosLogs = [];
  }
}

setWorldConstructor(ToolboxWorld);

// Re-exportado para que los step definitions no necesiten importar
// `EstadoUnidad` desde shared-types directamente en cada archivo.
export type { EstadoUnidad } from "@toolboxjl/shared-types";
