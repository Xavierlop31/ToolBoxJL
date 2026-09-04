import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from "class-validator";
import {
  ESTADOS_UNIDAD,
  TIPOS_MANTENIMIENTO,
  type EstadoUnidad,
  type TipoMantenimiento,
} from "@toolboxjl/shared-types";
import { SanitizarTextoLibre } from "../../../../shared/sanitize.util";

/**
 * PATCH /inventory/units/{id}/status (RF-1.3, HU-13.3). Los 6 campos de
 * taller/baja son todos opcionales — el backend no exige `motivo_baja` solo
 * cuando `estado_nuevo = "Dado de Baja"` ni el resto solo cuando es
 * `"En Mantenimiento"` (decisión explícita del contrato, ver openapi.yaml).
 *
 * `falla_reportada`/`tecnico_asignado`/`motivo_baja` son texto libre (Issue
 * #187): `@MaxLength` + `@SanitizarTextoLibre()`.
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
  @MaxLength(1000)
  @SanitizarTextoLibre()
  falla_reportada?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @SanitizarTextoLibre()
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
  @MaxLength(1000)
  @SanitizarTextoLibre()
  motivo_baja?: string;
}
