import { IsOptional, IsUUID } from "class-validator";

/** Query params de `GET /analytics/roi` (openapi.yaml). */
export class ConsultarRoiQueryDto {
  @IsOptional()
  @IsUUID()
  modelo_id?: string;
}
