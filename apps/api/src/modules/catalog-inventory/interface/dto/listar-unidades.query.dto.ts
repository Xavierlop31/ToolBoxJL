import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import {
  ESTADOS_VISUALIZACION_UNIDAD,
  type EstadoVisualizacionUnidad,
} from "@toolboxjl/shared-types";

/** GET /inventory/units — filtros aceptados por el contrato openapi.yaml (HU-13.1). */
export class ListarUnidadesQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(ESTADOS_VISUALIZACION_UNIDAD)
  estado?: EstadoVisualizacionUnidad;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
