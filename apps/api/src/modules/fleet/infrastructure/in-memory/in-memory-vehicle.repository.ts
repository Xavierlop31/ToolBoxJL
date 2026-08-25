import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Vehicle, VehicleInput } from "@toolboxjl/shared-types";
import type { VehicleRepository } from "../../domain/vehicle.repository";

/**
 * Implementación en memoria de `VehicleRepository` — usada SOLO por los
 * tests unitarios y los steps de Cucumber (mismo criterio que
 * `InMemoryToolModelRepository`): no requiere `DATABASE_URL` ni una base
 * real. No usar en runtime de producción.
 */
@Injectable()
export class InMemoryVehicleRepository implements VehicleRepository {
  private readonly vehiculos = new Map<string, Vehicle>();

  async crear(input: VehicleInput): Promise<Vehicle> {
    const vehiculo: Vehicle = {
      id: randomUUID(),
      tipo: input.tipo,
      capacidad_kg: input.capacidad_kg,
      capacidad_m3: input.capacidad_m3,
      zonas: input.zonas ?? [],
      repartidor_id: input.repartidor_id ?? null,
    };
    this.vehiculos.set(vehiculo.id, vehiculo);
    return vehiculo;
  }

  async buscarPorId(id: string): Promise<Vehicle | null> {
    return this.vehiculos.get(id) ?? null;
  }
}
