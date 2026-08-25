import { IsEnum } from "class-validator";
import type { MetodoPago } from "@toolboxjl/shared-types";

/**
 * DTO de `POST /orders/{id}/pay`. Deliberadamente NO acepta ningún dato de
 * tarjeta (PAN/CVV/fecha de vencimiento): docs/DESIGN.md §8 exige que esos
 * datos nunca se persistan ni se loguen acá — el frontend interactúa
 * directo con el widget/checkout de Wompi, que tokeniza la tarjeta; esta
 * API solo recibe el método elegido.
 */
export class PagarOrdenDto {
  @IsEnum(["pse", "tarjeta", "contra_entrega"])
  metodo!: MetodoPago;
}
