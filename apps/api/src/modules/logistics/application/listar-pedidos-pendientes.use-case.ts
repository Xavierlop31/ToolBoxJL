import { Inject, Injectable } from "@nestjs/common";
import type { Shipment } from "@toolboxjl/shared-types";
import { SHIPMENT_REPOSITORY } from "../infrastructure/logistics.tokens";
import type { ShipmentRepository } from "../domain/shipment.repository";

/**
 * `GET /logistics/pending-orders` (RF-3.1). Consumido por el Agente 1
 * (batch nocturno, Sprint 7) vía tool calling; el endpoint en sí es de este
 * sprint.
 */
@Injectable()
export class ListarPedidosPendientesUseCase {
  constructor(
    @Inject(SHIPMENT_REPOSITORY)
    private readonly shipments: ShipmentRepository,
  ) {}

  async ejecutar(): Promise<Shipment[]> {
    return this.shipments.listarPendientesDeAsignacion();
  }
}
