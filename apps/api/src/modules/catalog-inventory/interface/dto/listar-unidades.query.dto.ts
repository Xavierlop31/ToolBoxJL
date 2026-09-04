import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import {
  ESTADOS_VISUALIZACION_UNIDAD,
  type EstadoVisualizacionUnidad,
} from "@toolboxjl/shared-types";
import { SanitizarTextoLibre } from "../../../../shared/sanitize.util";

/**
 * GET /inventory/units — filtros aceptados por el contrato openapi.yaml
 * (HU-13.1). `q` es texto libre (Issue #187): `@MaxLength` +
 * `@SanitizarTextoLibre()`.
 */
export class ListarUnidadesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @SanitizarTextoLibre()
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
