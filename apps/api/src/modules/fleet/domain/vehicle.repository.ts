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
}
