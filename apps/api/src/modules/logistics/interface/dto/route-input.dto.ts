import { IsArray, IsDateString, IsUUID } from "class-validator";
import type { RouteInput } from "@toolboxjl/shared-types";

/**
 * Elemento del body (array) de `POST /logistics/assign-routes` —
 * `RouteInput` de openapi.yaml. El endpoint recibe un array de estos, uno
 * por vehículo/día (`ParseArrayPipe` en `LogisticsController` valida cada
 * elemento contra este DTO).
 */
export class RouteInputDto implements RouteInput {
  @IsUUID()
  vehiculo_id!: string;

  @IsDateString()
  fecha!: string;

  @IsArray()
  @IsUUID("4", { each: true })
  paradas!: string[];
}
