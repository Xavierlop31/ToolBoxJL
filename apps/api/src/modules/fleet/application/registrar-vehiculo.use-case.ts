import { Inject, Injectable } from "@nestjs/common";
import type { Vehicle, VehicleInput } from "@toolboxjl/shared-types";
import { VEHICLE_REPOSITORY } from "../infrastructure/fleet.tokens";
import type { VehicleRepository } from "../domain/vehicle.repository";

/**
 * RF-3.1 — POST /fleet/vehicles (solo admin, aplicado por RolesGuard en el
 * controller). Da de alta un vehículo de la flota; queda disponible de
 * inmediato para `POST /logistics/assign-routes` (no hay un paso de
 * "activación" separado).
 */
@Injectable()
export class RegistrarVehiculoUseCase {
  constructor(
    @Inject(VEHICLE_REPOSITORY)
    private readonly vehiculos: VehicleRepository,
  ) {}

  async ejecutar(input: VehicleInput): Promise<Vehicle> {
    return this.vehiculos.crear(input);
  }
}
