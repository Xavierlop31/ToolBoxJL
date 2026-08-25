import { IsArray, IsEnum, IsNumber, IsOptional, IsUUID, Min } from "class-validator";
import type { TipoVehiculo, VehicleInput } from "@toolboxjl/shared-types";

/**
 * POST /fleet/vehicles (RF-3.1) — refleja `VehicleInput` de openapi.yaml
 * (`allOf: [Vehicle]`, `required: [tipo, capacidad_kg, capacidad_m3]`).
 * No acepta `id` (lo genera el repositorio, mismo criterio que
 * `CrearModeloDto`/`CrearOrdenDto`).
 */
export class CrearVehiculoDto implements VehicleInput {
  @IsEnum(["moto", "camioneta", "camion"])
  tipo!: TipoVehiculo;

  @IsNumber()
  @Min(0)
  capacidad_kg!: number;

  @IsNumber()
  @Min(0)
  capacidad_m3!: number;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  zonas?: string[];

  @IsOptional()
  @IsUUID()
  repartidor_id?: string;
}
