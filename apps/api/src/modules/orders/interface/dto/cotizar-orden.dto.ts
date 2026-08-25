import { IsEnum, IsOptional, IsString, IsUUID, IsDateString } from "class-validator";

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
  direccion_entrega?: string;

  @IsUUID()
  zona_id!: string;
}
