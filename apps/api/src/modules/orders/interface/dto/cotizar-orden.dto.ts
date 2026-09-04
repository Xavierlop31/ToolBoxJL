import { IsEnum, IsOptional, IsString, IsUUID, IsDateString, MaxLength } from "class-validator";
import { SanitizarTextoLibre } from "../../../../shared/sanitize.util";

/**
 * `direccion_entrega` es texto libre (Issue #187): `@MaxLength` +
 * `@SanitizarTextoLibre()`.
 */
export class CotizarOrdenDto {
  @IsUUID()
  modelo_id!: string;

  @IsEnum(["alquiler", "venta"])
  tipo!: "alquiler" | "venta";

  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  @SanitizarTextoLibre()
  direccion_entrega?: string;

  @IsUUID()
  zona_id!: string;
}
