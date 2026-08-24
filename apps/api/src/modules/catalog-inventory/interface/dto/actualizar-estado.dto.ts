import { IsArray, IsIn, IsOptional, IsUrl } from "class-validator";
import { ESTADOS_UNIDAD, type EstadoUnidad } from "@toolboxjl/shared-types";

/** PATCH /inventory/units/{id}/status (RF-1.3). */
export class ActualizarEstadoDto {
  @IsIn(ESTADOS_UNIDAD)
  estado_nuevo!: EstadoUnidad;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  fotos_urls?: string[];
}
