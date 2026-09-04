import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import type { CheckoutCartInput, ModoRetorno } from "@toolboxjl/shared-types";
import { SanitizarTextoLibre } from "../../../../shared/sanitize.util";

/**
 * POST /orders/checkout-cart — cuerpo (openapi.yaml). `return_mode` es
 * opcional (a diferencia de `CrearOrdenDto`); ver `CheckoutCartUseCase` para
 * el default. `direccion_entrega` es texto libre (Issue #187): `@MaxLength`
 * + `@SanitizarTextoLibre()`.
 */
export class CheckoutCartDto implements CheckoutCartInput {
  @IsString()
  @MaxLength(300)
  @SanitizarTextoLibre()
  direccion_entrega!: string;

  @IsUUID()
  zona_id!: string;

  @IsOptional()
  @IsEnum(["en_sede", "recogida_domicilio"])
  return_mode?: ModoRetorno;
}
