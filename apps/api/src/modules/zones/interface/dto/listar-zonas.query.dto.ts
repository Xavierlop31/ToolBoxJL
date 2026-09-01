import { IsIn, IsOptional } from "class-validator";
import type { Ciudad } from "../../domain/zona-geografica";

/** GET /zones — filtro aceptado por el contrato openapi.yaml. */
export class ListarZonasQueryDto {
  @IsOptional()
  @IsIn(["Medellín", "Bogotá"])
  ciudad?: Ciudad;
}
