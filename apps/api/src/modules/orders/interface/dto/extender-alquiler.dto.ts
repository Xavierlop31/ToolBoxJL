import { IsDateString, IsEnum, IsOptional, IsUUID } from "class-validator";

/** POST /rentals/extend (Sprint 8, HU-9.2). */
export class ExtenderAlquilerDto {
  @IsUUID()
  order_id!: string;

  @IsDateString()
  nueva_fecha_fin!: string;

  @IsOptional()
  @IsEnum(["link_pago", "acumular_a_factura_final"])
  modo_cobro?: "link_pago" | "acumular_a_factura_final";
}
