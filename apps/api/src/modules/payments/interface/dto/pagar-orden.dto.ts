import { IsIn, IsString, ValidateIf } from "class-validator";
import type { MetodoPago, PagarOrdenInput, TipoDocumentoPse } from "@toolboxjl/shared-types";

/**
 * DTO de `POST /orders/{id}/pay`. Deliberadamente NO acepta ningún dato de
 * tarjeta (PAN/CVV/fecha de vencimiento): docs/DESIGN.md §8 exige que esos
 * datos nunca se persistan ni se loguen acá — el frontend interactúa
 * directo con el widget/checkout de Wompi, que tokeniza la tarjeta; esta
 * API solo recibe el método elegido.
 *
 * `user_legal_id_type`/`user_legal_id`/`financial_institution_code` solo
 * son requeridos si `metodo === "pse"` — Wompi los exige para armar
 * `payment_method` (ver WompiGatewayService.iniciarTransaccion).
 * `acceptance_token`/`accept_personal_auth` son requeridos siempre que
 * `metodo !== "contra_entrega"` — Wompi los exige en toda transacción real
 * (Habeas Data; ver GET /payments/wompi-terms). openapi.yaml no puede
 * expresar "requerido condicional", así que la validación real vive acá vía
 * `@ValidateIf`.
 */
export class PagarOrdenDto implements PagarOrdenInput {
  @IsIn(["pse", "tarjeta", "contra_entrega"])
  metodo!: MetodoPago;

  @ValidateIf((dto: PagarOrdenDto) => dto.metodo === "pse")
  @IsIn(["CC", "CE", "NIT", "TI", "PP"])
  user_legal_id_type?: TipoDocumentoPse;

  @ValidateIf((dto: PagarOrdenDto) => dto.metodo === "pse")
  @IsString()
  user_legal_id?: string;

  @ValidateIf((dto: PagarOrdenDto) => dto.metodo === "pse")
  @IsString()
  financial_institution_code?: string;

  @ValidateIf((dto: PagarOrdenDto) => dto.metodo !== "contra_entrega")
  @IsString()
  acceptance_token?: string;

  @ValidateIf((dto: PagarOrdenDto) => dto.metodo !== "contra_entrega")
  @IsString()
  accept_personal_auth?: string;
}
