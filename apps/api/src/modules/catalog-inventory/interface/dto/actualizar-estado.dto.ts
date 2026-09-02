import { IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, IsUrl, Min } from "class-validator";
import {
  ESTADOS_UNIDAD,
  TIPOS_MANTENIMIENTO,
  type EstadoUnidad,
  type TipoMantenimiento,
} from "@toolboxjl/shared-types";

/**
 * PATCH /inventory/units/{id}/status (RF-1.3, HU-13.3). Los 6 campos de
 * taller/baja son todos opcionales — el backend no exige `motivo_baja` solo
 * cuando `estado_nuevo = "Dado de Baja"` ni el resto solo cuando es
 * `"En Mantenimiento"` (decisión explícita del contrato, ver openapi.yaml).
 */
export class ActualizarEstadoDto {
  @IsIn(ESTADOS_UNIDAD)
  estado_nuevo!: EstadoUnidad;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  fotos_urls?: string[];

  @IsOptional()
  @IsIn(TIPOS_MANTENIMIENTO)
  tipo_mantenimiento?: TipoMantenimiento;

  @IsOptional()
  @IsString()
  falla_reportada?: string;

  @IsOptional()
  @IsString()
  tecnico_asignado?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  costo_estimado?: number;

  @IsOptional()
  @IsDateString()
  fecha_prevista_fin?: string;

  @IsOptional()
  @IsString()
  motivo_baja?: string;
}
