import { IsOptional, IsString } from "class-validator";

/** Query params de `GET /analytics/revenue` (openapi.yaml). */
export class ConsultarIngresosQueryDto {
  @IsOptional()
  @IsString()
  periodo?: string;
}
