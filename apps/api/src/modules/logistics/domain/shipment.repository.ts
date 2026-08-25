import type { EstadoEnvio, Shipment, TipoEnvio } from "@toolboxjl/shared-types";

/**
 * Payload de creación de un Shipment. Sin endpoint propio en openapi.yaml —
 * se crea automáticamente cuando una Orden queda `confirmada` (ver
 * PaymentsModule/PagarOrdenUseCase, decisión del Tech Lead Sprint 4).
 */
export interface NuevoShipmentInput {
  orderId: string;
  tipo: TipoEnvio;
  estadoEnvio: EstadoEnvio;
  vehiculoId: string | null;
}

/**
 * Puerto de repositorio para `Shipment` (Clean Architecture: el dominio
 * declara la interfaz, `infrastructure/` la implementa dos veces — Prisma
 * para runtime real, in-memory para los steps de Cucumber).
 */
export interface ShipmentRepository {
  crear(input: NuevoShipmentInput): Promise<Shipment>;
  buscarPorId(id: string): Promise<Shipment | null>;
  /** `GET /logistics/pending-orders` — Shipments en `pendiente_asignacion`. */
  listarPendientesDeAsignacion(): Promise<Shipment[]>;
  /**
   * `GET /logistics/shipments` — todos los envíos con su estado actual (el
   * feature `@RF-3.3` lista los 5 estados posibles como visibles en el
   * panel del Gerente, incluidos los terminales `entregado`/`retornado`).
   */
  listarTodos(): Promise<Shipment[]>;
  /**
   * `POST /logistics/assign-routes` — asigna el vehículo de la ruta al
   * Shipment y transiciona su `estado_envio` (`pendiente_asignacion` →
   * `en_ruta_entrega`/`en_ruta_recogida` según `tipo`).
   */
  asignarVehiculoYEstado(
    id: string,
    vehiculoId: string,
    estadoEnvio: EstadoEnvio,
  ): Promise<Shipment>;
}
