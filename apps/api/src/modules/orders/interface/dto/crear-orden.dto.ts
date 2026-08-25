import { IsEnum, IsOptional, IsString, IsUUID, IsDateString } from "class-validator";
import type { OrderInput, TipoOrden, ModoRetorno } from "@toolboxjl/shared-types";

export class CrearOrdenDto implements OrderInput {
  @IsUUID()
  modelo_id!: string;

  @IsEnum(["alquiler", "venta"])
  tipo!: TipoOrden;

  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

  @IsEnum(["en_sede", "recogida_domicilio"])
  return_mode!: ModoRetorno;

  @IsString()
  direccion_entrega!: string;

  @IsUUID()
  zona_id!: string;
}
