import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

/** GET /inventory/audit-feed — `limit` opcional (default 10, máx 50, ver openapi.yaml). */
export class ObtenerAuditoriaRecienteQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
