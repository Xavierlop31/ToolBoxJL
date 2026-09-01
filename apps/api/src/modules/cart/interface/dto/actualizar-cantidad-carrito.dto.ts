import { IsInt, Min } from "class-validator";

/** PATCH /cart/items/{id} — cuerpo (openapi.yaml): solo `cantidad`, no soporta cambiar `dias`. */
export class ActualizarCantidadCarritoDto {
  @IsInt()
  @Min(1)
  cantidad!: number;
}
