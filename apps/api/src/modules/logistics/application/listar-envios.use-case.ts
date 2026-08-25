import { Inject, Injectable } from "@nestjs/common";
import type { Shipment } from "@toolboxjl/shared-types";
import { SHIPMENT_REPOSITORY } from "../infrastructure/logistics.tokens";
import type { ShipmentRepository } from "../domain/shipment.repository";

/**
 * `GET /logistics/shipments` (RF-3.3). Sirve el snapshot inicial del panel
 * de seguimiento del Gerente; las actualizaciones en vivo llegan por
 * Supabase Realtime directo desde el frontend (ver migración de este
 * sprint, `ALTER PUBLICATION supabase_realtime ADD TABLE shipments`), no
 * por polling a este endpoint.
 */
@Injectable()
export class ListarEnviosUseCase {
  constructor(
    @Inject(SHIPMENT_REPOSITORY)
    private readonly shipments: ShipmentRepository,
  ) {}

  async ejecutar(): Promise<Shipment[]> {
    return this.shipments.listarTodos();
  }
}
