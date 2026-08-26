import type { Vehicle, VehicleInput } from "@toolboxjl/shared-types";

/**
 * Puerto de repositorio para `Vehicle` (Clean Architecture: el dominio
 * declara la interfaz, `infrastructure/` la implementa dos veces — Prisma
 * para runtime real, in-memory para los steps de Cucumber — mismo criterio
 * que `ToolModelRepository`).
 */
export interface VehicleRepository {
  crear(input: VehicleInput): Promise<Vehicle>;
  buscarPorId(id: string): Promise<Vehicle | null>;
  /**
   * `GET /logistics/my-route` (HU-8.2, Sprint 7) — el vehículo cuyo
   * `repartidor_id` coincide con el Repartidor autenticado, o `null` si no
   * tiene ninguno asignado. Asume `repartidor_id` único por vehículo (no hay
   * regla de negocio que permita asignar el mismo Repartidor a dos
   * vehículos a la vez; si eso llegara a pasar, devuelve el primero que
   * encuentre el repositorio).
   */
  buscarPorRepartidorId(repartidorId: string): Promise<Vehicle | null>;
}
