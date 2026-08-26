import { IsInt, IsOptional, IsUUID, Min } from "class-validator";
import type { CartItem } from "@toolboxjl/shared-types";

/** POST /cart/add-item — cuerpo `CartItem` (openapi.yaml). */
export class AgregarItemCarritoDto implements CartItem {
  @IsUUID()
  modelo_id!: string;

  @IsInt()
  @Min(1)
  cantidad!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  dias?: number;
}
