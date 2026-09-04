import { IsOptional, IsString, MaxLength } from "class-validator";
import { SanitizarTextoLibre } from "../../../../shared/sanitize.util";

/**
 * Query params de `GET /analytics/revenue` (openapi.yaml). `periodo` es
 * texto libre (Issue #187): `@MaxLength` + `@SanitizarTextoLibre()`.
 */
export class ConsultarIngresosQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @SanitizarTextoLibre()
  periodo?: string;
}
