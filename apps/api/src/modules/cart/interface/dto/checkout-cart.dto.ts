import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import type { CheckoutCartInput, ModoRetorno } from "@toolboxjl/shared-types";

/** POST /orders/checkout-cart — cuerpo (openapi.yaml). `return_mode` es opcional (a diferencia de `CrearOrdenDto`); ver `CheckoutCartUseCase` para el default. */
export class CheckoutCartDto implements CheckoutCartInput {
  @IsString()
  direccion_entrega!: string;

  @IsUUID()
  zona_id!: string;

  @IsOptional()
  @IsEnum(["en_sede", "recogida_domicilio"])
  return_mode?: ModoRetorno;
}
