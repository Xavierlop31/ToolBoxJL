import { IsDateString, IsOptional, IsString } from "class-validator";

/** GET /catalog/search — filtros aceptados por el contrato openapi.yaml. */
export class BuscarCatalogoQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  // Aceptados por conformidad con openapi.yaml; ver la nota de
  // BuscarCatalogoUseCase sobre por qué no filtran todavía.
  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @IsOptional()
  @IsDateString()
  fecha_fin?: string;
}
