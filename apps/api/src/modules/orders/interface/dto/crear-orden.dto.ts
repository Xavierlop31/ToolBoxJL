import { IsIn, IsOptional, IsString, IsUUID, IsDateString, MaxLength } from "class-validator";
import type { OrderInput, TipoOrden, ModoRetorno } from "@toolboxjl/shared-types";
import { SanitizarTextoLibre } from "../../../../shared/sanitize.util";

/**
 * `direccion_entrega` es texto libre (Issue #187): `@MaxLength` +
 * `@SanitizarTextoLibre()`.
 */
export class CrearOrdenDto implements OrderInput {
  @IsUUID()
  modelo_id!: string;

  @IsIn(["alquiler", "venta"])
  tipo!: TipoOrden;

  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

  @IsIn(["en_sede", "recogida_domicilio"])
  return_mode!: ModoRetorno;

  @IsString()
  @MaxLength(300)
  @SanitizarTextoLibre()
  direccion_entrega!: string;

  @IsUUID()
  zona_id!: string;
}
