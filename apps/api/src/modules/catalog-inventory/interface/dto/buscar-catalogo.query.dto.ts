import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { SanitizarTextoLibre } from "../../../../shared/sanitize.util";

/**
 * GET /catalog/search — filtros aceptados por el contrato openapi.yaml.
 * `q`/`categoria` son texto libre ingresado por un usuario anónimo (Issue
 * #187): `@MaxLength` + `@SanitizarTextoLibre()`.
 */
export class BuscarCatalogoQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @SanitizarTextoLibre()
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @SanitizarTextoLibre()
  categoria?: string;

  // Aceptados por conformidad con openapi.yaml; ver la nota de
  // BuscarCatalogoUseCase sobre por qué no filtran todavía.
  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

  // Sprint 12 (HU-12.1) — opcionales: sin ambos, /catalog/search no pagina
  // (ver BuscarCatalogoUseCase).
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsIn([6, 12, 24])
  pageSize?: number;
}
